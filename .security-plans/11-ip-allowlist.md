# 11 — IP Allowlist (Admin Erişim Kısıtlama)

## Konu Açıklaması

IP Allowlist, admin paneline erişimi belirli IP adreslerine kısıtlar. Sadece güvenilen ağlardan (ofis, VPN) erişim izni verilir. Diğer IP'lerden gelen istekler reddedilir.

## Mevcut Durum

- IP bazlı erişim kısıtlaması **YOK**
- Herhangi bir IP'den login yapılabilir
- Cloudflare'da IP bazlı kısıtlama yapılabilir ama uygulama seviyesinde yok

## Teknik Arka Plan

### Atlassian IP Allowlist:
- Premium ve Enterprise planlarda mevcut
- admin.atlassian.com'dan yönetilir
- Site-level endpoint'lere uygulanır
- CIDR notation destekler (192.168.1.0/24)

### Sınırlamaları:
- Uzaktan çalışan ekip üyeleri → VPN zorunlu veya IP güncelleme mekanizması
- Dinamik IP kullanıcıları → sorun yaratabilir
- Acil erişim durumları → bypass mekanizması gerekli

### Karar: Opsiyonel ve Yönetilebilir
- Admin portalından (admin.optima-hr.net) ayarlanabilir
- Varsayılan: **KAPALI** (enable edildikten sonra admin sıkışmasın)
- CIDR notation destekli
- Bypass kodu mekanizması (acil durumlar için)

## Uygulama Planı

### Adım 1: OrganizationSettings'e IP Allowlist Ayarı

```javascript
// Ayar key'leri:
// "security.ipAllowlistEnabled": false (varsayılan)
// "security.ipAllowlist": ["88.234.0.0/16", "192.168.1.0/24"]
// "security.ipAllowlistBypassCode": "hashed_bypass_code"
```

### Adım 2: IP Allowlist Middleware

```javascript
// middleware/ipAllowlist.js
const { OrganizationSettings } = require('../models/OrganizationSettings');

// IP listesini cache'le (her istekte DB sorgusu yapmamak için)
let cachedAllowlist = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

const refreshCache = async () => {
  if (Date.now() < cacheExpiry) return cachedAllowlist;
  
  try {
    const enabledSetting = await OrganizationSettings.findOne({
      where: { key: 'security.ipAllowlistEnabled' }
    });
    
    if (!enabledSetting || enabledSetting.value !== true) {
      cachedAllowlist = null;  // Deaktif
      cacheExpiry = Date.now() + CACHE_TTL;
      return null;
    }
    
    const listSetting = await OrganizationSettings.findOne({
      where: { key: 'security.ipAllowlist' }
    });
    
    cachedAllowlist = listSetting?.value || [];
    cacheExpiry = Date.now() + CACHE_TTL;
    return cachedAllowlist;
  } catch (err) {
    console.error('IP allowlist cache hatası:', err);
    return cachedAllowlist; // Eski cache'i kullan
  }
};

/**
 * IP'nin CIDR range'inde olup olmadığını kontrol et
 */
const ipInCIDR = (ip, cidr) => {
  if (cidr === ip) return true; // Tam eşleşme
  
  const [range, bits] = cidr.split('/');
  if (!bits) return ip === range;
  
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ip.split('.').reduce((a, b) => (a << 8) + parseInt(b), 0);
  const rangeNum = range.split('.').reduce((a, b) => (a << 8) + parseInt(b), 0);
  
  return (ipNum & mask) === (rangeNum & mask);
};

const ipAllowlistMiddleware = async (req, res, next) => {
  const allowlist = await refreshCache();
  
  // Allowlist deaktifse geç
  if (!allowlist || allowlist.length === 0) {
    return next();
  }
  
  const clientIP = req.headers['cf-connecting-ip'] ||
                   req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.ip;
  
  // IP kontrolü
  const isAllowed = allowlist.some(cidr => ipInCIDR(clientIP, cidr));
  
  if (isAllowed) {
    return next();
  }
  
  // Bypass kodu kontrolü (header veya query param)
  const bypassCode = req.headers['x-bypass-code'] || req.query.bypass;
  if (bypassCode) {
    // Bypass kodunu doğrula (DB'den hashlenmiş kodu al ve karşılaştır)
    const bypassSetting = await OrganizationSettings.findOne({
      where: { key: 'security.ipAllowlistBypassCode' }
    });
    if (bypassSetting) {
      const bcrypt = require('bcryptjs');
      if (await bcrypt.compare(bypassCode, bypassSetting.value)) {
        console.warn(`⚠️ IP Allowlist bypassed: ${clientIP}, user: ${req.user?.email}`);
        return next();
      }
    }
  }
  
  console.warn(`🚫 IP Allowlist blocked: ${clientIP}`);
  return res.status(404).json({ error: 'Endpoint not found' });
};

module.exports = ipAllowlistMiddleware;
```

### Adım 3: Server.js'e Uygulama

```javascript
// server.js — sadece admin route'larına uygula
const ipAllowlist = require('./middleware/ipAllowlist');

// Admin portal API'si
app.use('/api/admin', requireAuth, ipAllowlist, require('./routes/admin'));

// Opsiyonel: Tüm protected route'lara da uygulanabilir
// app.use('/api/', ipAllowlist);
```

### Adım 4: Admin Portal UI

Admin portalında (admin.optima-hr.net) güvenlik sayfasına IP Allowlist yönetim bölümü:
- Toggle: Aktif/Pasif
- IP listesi: ekleme/silme (CIDR destekli)
- Bypass kodu ayarlama
- Mevcut IP'yi otomatik ekleme butonu

## Dikkat Edilecekler

| Risk | Çözüm |
|------|-------|
| Admin kendini kilitler | Bypass kodu mekanizması |
| Cloudflare arkası IP | `cf-connecting-ip` header kullan |
| IPv6 adresleri | Şimdilik sadece IPv4 destekle |
| Cache tutarsızlığı | 5 dk TTL, ayar değişiminde cache temizle |
| Production'da test | Önce "sadece log" modu ile test et |

## Test Planı

1. ✅ IP Allowlist kapalıyken → herkes erişebilir
2. ✅ IP Allowlist açık + izinli IP → erişim var
3. ✅ IP Allowlist açık + izinsiz IP → 404
4. ✅ Bypass kodu ile izinsiz IP → erişim var
5. ✅ CIDR notation çalışıyor (192.168.1.0/24)
6. ✅ Admin portal UI'dan IP ekleme/silme
7. ✅ Cache yenileniyor (5 dk)

## Bağımlılıklar
- Plan 01 (Route Auth) tamamlanmış olmalı
- Plan 03 (Cookie) ile koordineli

## Tahmini Süre
- Backend: ~40 dakika
- Frontend UI: ~30 dakika (admin portal)
- Test: ~20 dakika
