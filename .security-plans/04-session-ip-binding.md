# 04 — Session IP Bağlama

## Konu Açıklaması

Session IP binding, kullanıcının giriş yaptığı IP adresini JWT token'a gömer ve sonraki isteklerde IP'nin aynı olup olmadığını kontrol eder. IP değişirse oturum geçersiz sayılır. Bu, token çalınması durumunda saldırganın farklı IP'den kullanmasını engeller.

## Mevcut Durum

- JWT payload'ında IP bilgisi **yok**
- Token çalınırsa, saldırgan dünyanın herhangi bir yerinden kullanabilir
- Hiçbir IP doğrulaması yapılmıyor

## Teknik Arka Plan

### Atlassian'ın Yaklaşımı:
- "Require consistent client IP address" özelliği
- Oturum başlangıcında IP kaydedilir
- Farklı IP'den erişim → zorunlu re-authentication
- Bu özellik ON/OFF yapılabilir (admin tarafından yönetilir)

### Faydaları:
- Token çalınması → farklı IP'den kullanılamaz
- Lateral movement engeli — ağ içi hareket kısıtlanır
- Oturum hijacking zorlaşır

### Riskleri ve Sınırlamaları:
- **Mobil kullanıcılar** — WiFi/mobil veri geçişlerinde IP değişir → zorunlu re-login
- **Dinamik IP** — bazı ISP'ler IP'yi sık değiştirir
- **VPN kullanıcıları** — VPN bağlantısı koparsa IP değişir
- **Proxy/Load balancer** — `X-Forwarded-For` güvenilirliği
- **Cloudflare** arkasında gerçek IP: `cf-connecting-ip` header kullanılır

### Karar: Opsiyonel yapıyoruz
Admin panelinden açılıp kapatılabilir olmalı. Varsayılan: **AÇIK** (admin kullanıcılar genellikle sabit IP'den erişir).

## Uygulama Planı

### Adım 1: Login Sırasında IP'yi JWT'ye Göm

```javascript
// auth.js — login başarılı olduğunda
const clientIP = req.headers['cf-connecting-ip'] ||
                 req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                 req.ip;

const token = jwt.sign({
  id: user.id,
  email: user.email,
  role: user.role,
  ip: clientIP  // IP'yi token'a göm
}, JWT_SECRET, { expiresIn: '30m' });
```

### Adım 2: requireAuth'da IP Kontrolü

```javascript
// middleware/requireAuth.js
const requireAuth = async (req, res, next) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // IP binding kontrolü
    if (decoded.ip) {
      const currentIP = req.headers['cf-connecting-ip'] ||
                        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                        req.ip;
      
      if (decoded.ip !== currentIP) {
        console.warn(`⚠️ IP mismatch: token=${decoded.ip}, current=${currentIP}, user=${decoded.email}`);
        // Audit log: şüpheli IP değişikliği
        return res.status(404).json({ error: 'Endpoint not found' });
      }
    }
    
    req.user = decoded;
    next();
  } catch (error) { ... }
};
```

### Adım 3: IP Alma Fonksiyonunu Standardize Et

Cloudflare arkasında doğru IP almak kritik:

```javascript
// utils/getClientIP.js
const getClientIP = (req) => {
  return req.headers['cf-connecting-ip'] ||    // Cloudflare
         req.headers['x-real-ip'] ||            // Nginx
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() || // Proxy
         req.ip ||                               // Express
         req.connection?.remoteAddress ||
         null;
};

module.exports = getClientIP;
```

Bu fonksiyon tüm dosyalarda kullanılacak (applications.js, invitations.js, auth.js hepsinde farklı IP alma kodu var).

### Adım 4: Admin Panelinden Yönetilebilirlik (Faz 2)

`OrganizationSettings` tablosuna:
```
key: "security.ipBinding"
value: true (varsayılan)
```

requireAuth middleware'i bu ayarı kontrol edecek (cache ile).

## Test Planı

1. ✅ Login → JWT payload'ında `ip` alanı var
2. ✅ Aynı IP'den istek → normal çalışır
3. ✅ Farklı IP'den aynı cookie → 404
4. ✅ `cf-connecting-ip` header'ı doğru okunuyor
5. ✅ `x-forwarded-for` fallback çalışıyor
6. ✅ Audit log: IP mismatch kaydedildi

## Bağımlılıklar
- Plan 01 (Route Auth) ve Plan 03 (Cookie) tamamlanmış olmalı

## Tahmini Süre
- Uygulama: ~25 dakika
- Test: ~15 dakika
