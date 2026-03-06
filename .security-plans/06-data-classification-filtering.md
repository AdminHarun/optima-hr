# 06 — Veri Sınıflandırma ve Filtreleme (KVKK Uyumluluğu)

## Konu Açıklaması

API response'larında döndürülen verilerin hassasiyet seviyesine göre sınıflandırılması ve filtrelenmesi. KVKK (Kişisel Verilerin Korunması Kanunu) kapsamında kişisel verilerin minimum düzeyde ve yalnızca yetkili kişilere sunulması zorunludur.

## Mevcut Durum

### Hassas Veri Sınıflandırması

| Veri | KVKK Seviyesi | Mevcut Durumu |
|------|:------------:|:-------------:|
| TC Kimlik No | 🔴 Özel Nitelikli | Açık döndürülüyor |
| Doğum Tarihi | 🟡 Kişisel | Açık döndürülüyor |
| Telefon | 🟡 Kişisel | Açık döndürülüyor |
| Email | 🟡 Kişisel | Açık döndürülüyor |
| Adres | 🟡 Kişisel | Açık döndürülüyor |
| chatToken | 🔴 Gizli (auth token) | Açık döndürülüyor |
| sessionToken | 🔴 Gizli (auth token) | Açık döndürülüyor |
| IP Adresi | 🟡 Kişisel | Açık döndürülüyor |
| Cihaz Bilgisi | 🟡 Kişisel | Açık döndürülüyor |

### Etkilenen Endpoint'ler ve Location

**`applications.js`:**
- Satır 629: `chatToken: p.chat_token` (profiles/all listesi)
- Satır 630: `sessionToken: p.session_token`
- Satır 638: `profileCreatedIp: p.profile_created_ip`
- Satır 698: `tcNumber: app.tc_number` (applications listesi)
- Satır 794-798: profiller kısa yol (aynı sorunlar)
- Satır 542-548: profil detay (tüm hassas veriler)
- Satır 875-880: tek başvuru detay

**`invitations.js`:**
- Satır 86: `token: inv.token` (tam davet tokeni)
- Satır 91: `ipAddress` (IP adresi)
- Satır 96-98: IP adresleri

## Uygulama Planı

### Adım 1: Maskeleme Helper Fonksiyonları

```javascript
// utils/dataMasking.js

/**
 * TC Kimlik No maskeleme
 * "12345678901" → "*******8901"
 */
const maskTC = (tc) => {
  if (!tc) return null;
  const str = String(tc);
  return '*'.repeat(Math.max(0, str.length - 4)) + str.slice(-4);
};

/**
 * Telefon maskeleme  
 * "0555 123 45 67" → "0555 *** ** 67"
 */
const maskPhone = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return digits.slice(0, 4) + '***' + digits.slice(-2);
};

/**
 * Email maskeleme
 * "furkan@optima.com" → "fu***@optima.com"
 */
const maskEmail = (email) => {
  if (!email) return null;
  const [local, domain] = email.split('@');
  return local.slice(0, 2) + '***@' + domain;
};

/**
 * Token maskeleme (son 6 karakter)
 * "chat_1770009775766_nd1c0hmps" → "...0hmps"
 */
const maskToken = (token) => {
  if (!token) return null;
  return '...' + token.slice(-6);
};

/**
 * IP maskeleme
 * "88.234.156.42" → "88.234.***.**"
 */
const maskIP = (ip) => {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length !== 4) return '***';
  return `${parts[0]}.${parts[1]}.***.***`;
};

module.exports = { maskTC, maskPhone, maskEmail, maskToken, maskIP };
```

### Adım 2: Veri Seviyesi Tanımlaması

3 seviye tanımlıyoruz:

| Seviye | Açıklama | Maskeleme |
|--------|---------|-----------|
| `PUBLIC` | Dış dünyaya gösterilebilir | Tam maskeleme |
| `LIST` | Admin listelerinde gösterilir | Kısmi maskeleme |
| `DETAIL` | Admin detay sayfasında gösterilir | Maskeleme yok |

### Adım 3: Endpoint'lere Seviye Bazlı Filtreleme

**Liste Endpoint'leri** (`GET /`, `GET /profiles`, `GET /profiles/all`):

```javascript
// applications.js — profiles/all
const formattedProfiles = profiles.map(p => ({
  id: p.id,
  firstName: p.first_name,
  lastName: p.last_name,
  email: p.email,           // ✅ Liste'de tam (admin görmeli)
  phone: p.phone,           // ✅ Liste'de tam
  createdAt: p.profile_created_at,
  siteCode: p.site_code,
  hasApplication: ...,
  applicationStatus: ...,
  // 🚫 KALDIRILAN ALANLAR:
  // chatToken → kaldırıldı
  // sessionToken → kaldırıldı
  // profileCreatedIp → kaldırıldı
  // profileCreatedLocation → kaldırıldı
  // deviceInfo → kaldırıldı
}));
```

```javascript
// applications.js — applications listesi (GET /)
const formattedApplications = applications.map(app => ({
  ...diğer alanlar,
  tcNumber: maskTC(app.tc_number),  // "*******8901"
  // token → kaldırıldı
  // profileId → kaldırıldı (iç referans)
}));
```

**Detay Endpoint'leri** (`GET /:id`, `GET /profile/:id`):

```javascript
// applications.js — tek başvuru detayı
res.json({
  ...diğer alanlar,
  tc_number: application.tc_number,  // ✅ Detayda tam (admin görmeli)
  submitted_ip: application.submitted_ip, // ✅ Detayda tam (fraud tespiti)
  profileCreatedIp: profile?.profile_created_ip, // ✅ Detayda tam
  // 🚫 Hala kaldırılan:
  // chatToken → kaldırıldı (hiçbir yerde olmamalı)
  // sessionToken → kaldırıldı
});
```

### Adım 4: Invitations Filtreleme

```javascript
// invitations.js — liste
const formattedInvitations = invitations.map(inv => ({
  id: inv.id,
  email: inv.email,
  token: maskToken(inv.token),  // "...son6kr"
  status: inv.status,
  createdAt: inv.created_at,
  clickedAt: inv.first_clicked_at,
  usedAt: inv.form_completed_at,
  applicantName: inv.applicant_name,
  // 🚫 KALDIRILAN:
  // ipAddress → kaldırıldı
  // first_accessed_ip → kaldırıldı
  // form_submitted_ip → kaldırıldı
  // click_count → kaldırıldı (info leak)
}));
```

## KVKK Uyumluluk Notları

1. **Veri minimizasyonu ilkesi** — sadece gerekli veri gösterilmeli
2. **TC kimlik numarası** — özel nitelikli kişisel veri, açık rıza gerektirir
3. **Log'larda** kişisel veri saklanmamalı veya maskelenmelidir
4. **Veri ihlaline** 72 saat içinde KVKK kuruluna bildirim zorunludur
5. **Erişim logları** tutulmalı — kimin hangi veriye ne zaman eriştiği

## Test Planı

1. ✅ `GET /api/applications` → `tcNumber: "*******8901"` (maskelenmiş)
2. ✅ `GET /api/applications/profiles` → `chatToken` ve `sessionToken` yok
3. ✅ `GET /api/applications/:id` → `tc_number` tam görünür (detay)
4. ✅ `GET /api/invitations` → `token` maskelenmiş (son 6)
5. ✅ `POST /api/invitations` → `token` tam (oluşturma anı)
6. ✅ IP adresleri listelerden kaldırılmış, detayda tam

## Bağımlılıklar
- Plan 01 (Route Auth) tamamlanmış olmalı
- `utils/dataMasking.js` oluşturulmalı

## Tahmini Süre
- Uygulama: ~45 dakika
- Test: ~20 dakika
