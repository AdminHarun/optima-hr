# 02 — Token Kapsamı ve Güvenliği (Scope, Expiry, Exposure)

## Konu Açıklaması

API token'ları (chatToken, sessionToken, invitation token) kimlik doğrulama ve yetkilendirme süreçlerinin temelini oluşturur. Bu token'ların güvenli üretilmesi, dar kapsamlı olması, API response'larında gizlenmesi ve düzenli süresinin dolması gerekir.

## Mevcut Durum Analizi

### Token Üretim Kontrolü

| Token | Üretim Yöntemi | Güvenli mi? |
|-------|---------------|-------------|
| `chatToken` | `chat_${Date.now()}_${Math.random()}` | ❌ Tahmin edilebilir |
| `sessionToken` | `session_${Date.now()}_${Math.random()}` | ❌ Tahmin edilebilir |
| `invitation token` | 32 karakter random, `Math.random()` | ❌ Kriptografik değil |
| `JWT` | `jsonwebtoken` ile imzalanmış | ✅ Güvenli |

### Maruz Kalma (Exposure)

`chatToken` ve `sessionToken` 13'er endpoint response'unda açıkça döndürülüyor:

```json
// GET /api/applications/profiles — şu an dönen veri
{
  "chatToken": "chat_1770009775766_nd1c0hmps",
  "sessionToken": "session_177000475834_ect3a0f31",
  "profileCreatedIp": "66.229.143.35"
}
```

Bu token'lar ile herkes o kullanıcı olarak işlem yapabilir.

### Risk Senaryoları

| Senaryo | Etki |
|---------|------|
| `chatToken` çalınır → saldırgan başvuranmış gibi mesaj atar | Sahte iletişim, veri sızıntısı |
| `sessionToken` çalınır → başvuran hesabına erişim | Kimlik hırsızlığı, veri değiştirme |
| `Math.random()` ile üretilen token brute-force yapılır | Token tahmin edilerek hesap ele geçirme |
| Token süresi dolmaz → sonsuza kadar geçerli | Eski token'lar kullanılarak erişim |

## Teknik Arka Plan

### Kriptografik Token Üretimi (OWASP Önerisi)
```javascript
// ❌ YANLIŞ — Math.random() kriptografik değil
const token = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ✅ DOĞRU — crypto.randomBytes kullan
const crypto = require('crypto');
const token = crypto.randomBytes(32).toString('hex'); // 64 karakter hex
```

`Math.random()` sözde-rastgele (PRNG) sayı üretir ve tekrarlanabilir. Güvenlik uygulamalarında `crypto.randomBytes()` kullanılmalıdır.

### Atlassian Token Yaklaşımı
- Token'lar kapsamlı (scoped) — sadece belirli işlemlere izin verir
- Varsayılan 1 yıl expire süresi, ayarlanabilir
- Admin panelinden tüm token'lar izlenebilir ve iptal edilebilir
- Token kullanım logları tutulur

## Uygulama Planı

### Adım 1: Token Üretimini Güçlendir

```javascript
// utils/tokenGenerator.js
const crypto = require('crypto');

const generateSecureToken = (prefix = '') => {
  const randomPart = crypto.randomBytes(32).toString('hex');
  return prefix ? `${prefix}_${randomPart}` : randomPart;
};

module.exports = { generateSecureToken };
```

**Değişecek dosyalar:**
- `applications.js` → chatToken ve sessionToken üretimi
- `invitations.js` → invitation token üretimi

### Adım 2: Token'ları Response'lardan Kaldır

**KURAL:** Token'lar sadece **oluşturulduğu anda** ve **doğrulama endpoint'inde** döndürülecek.

| Endpoint | chatToken | sessionToken | Invitation Token |
|----------|:---------:|:------------:|:----------------:|
| `POST /submit` (oluşturma anı) | ✅ döner | ❌ | ❌ |
| `POST /applicant-login` | ❌ | ✅ döner (cookie olarak) | ❌ |
| `GET /profiles` (liste) | 🚫 kaldır | 🚫 kaldır | 🚫 kaldır |
| `GET /profiles/all` | 🚫 kaldır | 🚫 kaldır | 🚫 kaldır |
| `GET /:id` (detay) | 🚫 kaldır | 🚫 kaldır | 🚫 kaldır |
| `GET /profile/:id` | 🚫 kaldır | 🚫 kaldır | maskelenmiş son 6 |
| `GET /` (invitations liste) | — | — | maskelenmiş son 6 |
| `POST /` (invitation oluşturma) | — | — | ✅ tek seferlik tam |

### Adım 3: Token Expire Mekanizması

Şu an `chatToken` ve `sessionToken` süresi dolmuyor. Expire mekanizması ekle:

```javascript
// ApplicantProfile model'ine ekle
session_token_expires: {
  type: DataTypes.DATE,
  allowNull: true
}

// Token doğrulama sırasında kontrol
if (profile.session_token_expires && new Date() > profile.session_token_expires) {
  return res.status(401).json({ error: 'Session süresi dolmuş' });
}
```

### Adım 4: Token Maskeleme Helper'ı

```javascript
const maskToken = (token) => {
  if (!token) return null;
  return '...' + token.slice(-6);
};
// Örnek: "chat_1770009775766_nd1c0hmps" → "...0hmps"
```

## Test Planı

1. ✅ Yeni chatToken → `crypto.randomBytes` ile üretilmiş (64 hex karakter)
2. ✅ `GET /api/applications/profiles` → `chatToken` ve `sessionToken` yok
3. ✅ `GET /api/invitations` → `token` maskelenmiş (son 6 karakter)
4. ✅ `POST /api/invitations` → tam token döner (tek seferlik)
5. ✅ Eski token'lar hala çalışıyor (backward compatibility)
6. ✅ Admin paneli normal çalışıyor

## Bağımlılıklar
- Plan 01 (Route Auth) tamamlanmış olmalı

## Tahmini Süre
- Uygulama: ~45 dakika
- Test: ~20 dakika
