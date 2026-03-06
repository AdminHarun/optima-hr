# 09 — Güvenlik Header'ları (Helmet, CSP, HSTS)

## Konu Açıklaması

HTTP güvenlik header'ları, tarayıcıya uygulamanın güvenlik politikalarını bildirir. XSS, clickjacking, MIME sniffing ve diğer istemci tarafı saldırıları bu header'larla engellenir.

## Mevcut Durum

Cloudflare bazı header'ları otomatik ekliyor:
- ✅ `Strict-Transport-Security` (HSTS) — Cloudflare yönetiyor
- ❌ `Content-Security-Policy` (CSP) — **YOK**
- ❌ `X-Content-Type-Options` — **YOK** (backend'den)
- ❌ `X-Frame-Options` — **YOK** (backend'den)
- ❌ `Referrer-Policy` — **YOK** (backend'den)
- ❌ `Permissions-Policy` — **YOK**

## Teknik Arka Plan

### Helmet.js Nedir?
Express.js için güvenlik header middleware'i. 15+ güvenlik header'ını tek pakette yönetir.

### Her Header Ne Yapar:

| Header | Saldırı | Koruma |
|--------|---------|--------|
| `Content-Security-Policy` | XSS | Hangi kaynakların yüklenebileceğini kontrol eder |
| `X-Content-Type-Options: nosniff` | MIME confusion | Tarayıcının content type tahminini engeller |
| `X-Frame-Options: SAMEORIGIN` | Clickjacking | Sayfanın iframe'e alınmasını engeller |
| `Referrer-Policy` | Bilgi sızıntısı | Referrer header'ından URL sızıntısını kontrol eder |
| `Strict-Transport-Security` | Downgrade | HTTPS zorunluluğu |
| `X-DNS-Prefetch-Control` | DNS leak | DNS prefetch kontrolü |
| `X-Permitted-Cross-Domain-Policies` | Flash/PDF XSS | Cross-domain politikası |
| `Permissions-Policy` | Feature abuse | Kamera, mikrofon, geolocation kontrolü |

### CSP Detaylı Açıklama:
CSP en güçlü korumadır. Script'lerin nereden yüklenebileceğini kontrol eder:
- `script-src 'self'` → sadece kendi domain'inden script
- `script-src 'unsafe-inline'` → inline script'lere izin (güvenlik riski)
- `default-src 'self'` → varsayılan kaynak kısıtlaması

**DİKKAT:** CSP çok sıkı ayarlanırsa uygulama bozulabilir. Turnstile gibi 3rd party script'ler için explicit izin gerekir.

## Uygulama Planı

### Adım 1: Helmet Kurulumu

```bash
npm install helmet
```

### Adım 2: Helmet Konfigürasyonu

```javascript
// server.js
const helmet = require('helmet');

app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://challenges.cloudflare.com",  // Turnstile
        "https://static.cloudflareinsights.com"  // CF Analytics
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],  // MUI inline styles
      imgSrc: [
        "'self'",
        "data:",  // Base64 images
        "blob:",  // Blob URLs
        "https://*.cloudflare.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.optima-hr.net",
        "wss://api.optima-hr.net",  // WebSocket
        "https://challenges.cloudflare.com"
      ],
      frameSrc: [
        "https://challenges.cloudflare.com"  // Turnstile iframe
      ],
      fontSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      objectSrc: ["'none'"],  // Flash/Java applet engelle
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]  // Clickjacking koruması
    }
  },
  
  // HSTS — Cloudflare yönetiyor, ama backend de eklesin
  hsts: {
    maxAge: 31536000,  // 1 yıl
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: { action: 'deny' },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // X-DNS-Prefetch-Control
  dnsPrefetchControl: { allow: false },
  
  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  
  // Eski IE XSS filtresi (artık çoğu tarayıcıda yok)
  xssFilter: true
}));

// Permissions-Policy (helmet v7+ ile ayrı)
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  next();
});
```

### Adım 3: API vs Frontend CSP Ayrımı

API endpoint'leri HTML döndürmüyor → CSP daha sıkı olabilir:

```javascript
// API route'ları için daha sıkı CSP
app.use('/api/', helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));
```

## Uyarılar

| Potansiyel Sorun | Çözüm |
|-----------------|-------|
| MUI inline styles bozulabilir | `styleSrc: "'unsafe-inline'"` ile izin |
| Turnstile çalışmayabilir | `scriptSrc` ve `frameSrc`'ye CF domain ekle |
| WebSocket bağlantı kesilmesi | `connectSrc`'ye `wss://` ekle |
| Google Fonts yüklenmemesi | `fontSrc`'ye Google domains ekle |
| Base64 avatarlar görünmemesi | `imgSrc`'ye `data:` ekle |

## Test Planı

1. ✅ Response header'larında CSP var
2. ✅ X-Content-Type-Options: nosniff
3. ✅ X-Frame-Options: DENY
4. ✅ Referrer-Policy: strict-origin-when-cross-origin
5. ✅ Admin paneli normal çalışıyor (stil, script, font)
6. ✅ Turnstile CAPTCHA çalışıyor
7. ✅ WebSocket bağlantısı çalışıyor
8. ✅ Kariyer portalı bozulmamış

## Bağımlılıklar
- `npm install helmet`

## Tahmini Süre
- Uygulama: ~20 dakika
- Test: ~30 dakika (tüm frontend'leri kontrol etmek gerekli)
