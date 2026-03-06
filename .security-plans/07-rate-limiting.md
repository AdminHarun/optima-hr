# 07 — Rate Limiting (Uygulama Seviyesi)

## Konu Açıklaması

Rate limiting, belirli bir zaman aralığında bir istemcinin yapabileceği istek sayısını sınırlar. Brute-force saldırıları, credential stuffing, DoS ve scraping girişimlerini engeller.

## Mevcut Durum

- **Cloudflare seviyesi:** 100 istek/dakika (genel) — zaten aktif
- **Uygulama seviyesi:** Sadece login endpoint'inde basit `Map()` tabanlı IP throttling var
- **API endpoint'leri:** Sınırsız istek yapılabilir
- **Mevcut login koruması:** MAX_ATTEMPTS=5, LOCKOUT_MS=15dk, in-memory Map

### Mevcut Login Rate Limiting (auth.js):
```javascript
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
```
Problem: In-memory → sunucu restart'ında sıfırlanır, multi-instance'da paylaşılmaz.

## Teknik Arka Plan

### Katmanlı Rate Limiting Stratejisi (Endüstri Standardı):

```
[Cloudflare] → Genel DDoS koruması (100/dk)
    ↓
[Express Global] → Uygulama geneli (60/dk per IP)
    ↓
[Route-Specific] → Login: 10/dk, API: 30/dk, File upload: 5/dk
```

### OWASP API4:2023 — Unrestricted Resource Consumption:
- Her endpoint rate limit'e sahip olmalı
- Login/auth endpoint'ler çok daha sıkı sınırlandırılmalı
- 429 Too Many Requests status kodu döndürülmeli (ama maskeleme isteniyor → 404)
- Rate limit header'ları bilgilendirici ama saldırgana da bilgi verir → opsiyonel

## Uygulama Planı

### Adım 1: Bağımlılık Kurulumu

```bash
npm install express-rate-limit
```

### Adım 2: Rate Limiter Tanımlamaları

```javascript
// middleware/rateLimiters.js
const rateLimit = require('express-rate-limit');

// Genel API limiti — IP başına 60 istek/dakika
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: false,  // Rate limit header'larını gizle
  legacyHeaders: false,
  message: { error: 'Endpoint not found' },  // 404 ile maskele
  statusCode: 404,
  keyGenerator: (req) => {
    return req.headers['cf-connecting-ip'] ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.ip;
  }
});

// Auth endpointleri — çok sıkı (10 istek/dakika)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Endpoint not found' },
  statusCode: 404,
  skipSuccessfulRequests: true,  // Başarılı login'ler saymaz
  keyGenerator: (req) => {
    return req.headers['cf-connecting-ip'] ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.ip;
  }
});

// Başvuru formu — form spam engelleme (5 istek/15dk per IP)
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Endpoint not found' },
  statusCode: 404,
  keyGenerator: (req) => {
    return req.headers['cf-connecting-ip'] ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.ip;
  }
});

// Admin API — moderate (30 istek/dakika)
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: 'Endpoint not found' },
  statusCode: 404,
  keyGenerator: (req) => {
    return req.headers['cf-connecting-ip'] ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.ip;
  }
});

module.exports = { apiLimiter, authLimiter, submitLimiter, adminLimiter };
```

### Adım 3: Server.js'e Uygulama

```javascript
// server.js
const { apiLimiter, authLimiter, submitLimiter, adminLimiter } = require('./middleware/rateLimiters');

// Genel API limiti
app.use('/api/', apiLimiter);

// Auth — çok sıkı
app.use('/api/auth/login', authLimiter);
app.use('/api/apply/applicant-login', authLimiter);

// Form gönderimi — spam engelleme
app.use('/api/apply/submit', submitLimiter);

// Admin endpointleri
app.use('/api/admin/', adminLimiter);
```

### Adım 4: Eski Login Rate Limiting'i Koru

Mevcut `loginAttempts` Map'ini kaldırmıyoruz — `express-rate-limit` ile birlikte çalışır. İkisi farklı katmanlar:
- `express-rate-limit` → IP bazlı istek sayısı
- `loginAttempts Map` → Hesap bazlı başarısız deneme sayısı ve lockout

### Rate Limit Değerleri Özeti

| Endpoint | Limit | Pencere | Amaç |
|----------|:-----:|:-------:|------|
| `/api/*` (genel) | 60 | 1 dk | Scraping/DoS |
| `/api/auth/login` | 10 | 1 dk | Brute force |
| `/api/apply/applicant-login` | 10 | 1 dk | Brute force |
| `/api/apply/submit` | 5 | 15 dk | Form spam |
| `/api/admin/*` | 30 | 1 dk | Admin API koruması |

## Test Planı

1. ✅ 60'tan fazla istek/dk → 404 dönmeli
2. ✅ Login'e 10+ istek/dk → 404 dönmeli
3. ✅ Başarılı login saymaz (skipSuccessfulRequests)
4. ✅ Rate limit header'ları gizli (standardHeaders: false)
5. ✅ Normal kullanımda sorun yok (1-2 istek/saniye)
6. ✅ Cloudflare + uygulama rate limiting birlikte çalışır

## Bağımlılıklar
- `npm install express-rate-limit`
- Plan 01 (Route Auth) ile koordineli mount sırası

## Tahmini Süre
- Uygulama: ~20 dakika
- Test: ~15 dakika
