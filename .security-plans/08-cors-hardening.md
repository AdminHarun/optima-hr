# 08 — CORS Politikası Sıkılaştırma

## Konu Açıklaması

Cross-Origin Resource Sharing (CORS), tarayıcının bir domain'den yüklenen JavaScript'in başka bir domain'e istek yapıp yapamayacağını kontrol eden güvenlik mekanizmasıdır. Yanlış ayarlanmış CORS, saldırganların kendi web sitelerinden API'ye istek yapmasına izin verir.

## Mevcut Durum

`server.js`'deki mevcut CORS ayarını inceleyelim:

```javascript
// Tipik sorunlu konfigürasyon:
app.use(cors({
  origin: true,  // ❌ TÜM origin'lere izin verir
  credentials: true
}));
```

`origin: true` + `credentials: true` kombinasyonu **son derece tehlikeli**:
- Herhangi bir web sitesinden cookie ile istek yapılabilir
- Saldırgan kendi sitesinden API'ye istek atabilir, kurbanın cookie'leri otomatik gönderilir
- Bu durum tam bir CSRF + veri sızıntısı açığıdır

## Teknik Arka Plan

### CORS Nasıl Çalışır:
1. Tarayıcı cross-origin istekte `Origin` header'ı gönderir
2. Sunucu `Access-Control-Allow-Origin` ile izin verip vermediğini belirtir
3. `credentials: true` ise → `Access-Control-Allow-Credentials: true` döner
4. Cookie'ler sadece `credentials: true` ve izin verilen origin ile gönderilir

### Kritik Kural (RFC 6454):
`Access-Control-Allow-Origin: *` ile `Access-Control-Allow-Credentials: true` **BİRLİKTE KULLANILAMAZ**.
Tarayıcı bu kombinasyonu reddeder. AMA `origin: true` → gelen origin neyse onu mirror eder → wildcard gibi çalışır ama tarayıcı engeli atlar.

### Saldırı Senaryosu:
```
1. Saldırgan evil.com'da script yazar
2. Script, api.optima-hr.net'e fetch isteği atar (credentials: include)
3. Kurban evil.com'u ziyaret ederse, tarayıcı cookie'leri gönderir
4. Saldırgan kurbanın verilerine erişir
```

### Atlassian CORS:
- Domain whitelist — sadece bilinen origin'lere izin
- Jira Cloud'da CORS whitelist **yok** (güvenlik nedeniyle)
- Data Center'da admin tarafından yönetilebilir

## Uygulama Planı

### Adım 1: İzin Verilen Origin Listesi

```javascript
// config/cors.js
const allowedOrigins = [
  // Production
  'https://app.optima-hr.net',
  'https://admin.optima-hr.net',
  'https://pub.optima-hr.net',
  'https://emp.optima-hr.net',
  'https://api.optima-hr.net',
  
  // Development (sadece NODE_ENV !== production)
  ...(process.env.NODE_ENV !== 'production' ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://localhost:5174',
  ] : [])
];

module.exports = { allowedOrigins };
```

### Adım 2: CORS Middleware Konfigürasyonu

```javascript
// server.js
const cors = require('cors');
const { allowedOrigins } = require('./config/cors');

app.use(cors({
  origin: (origin, callback) => {
    // origin undefined → server-to-server veya Postman istekleri (izin ver)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked: ${origin}`);
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Site-Id',
    'X-Requested-With'
  ],
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  maxAge: 600  // Preflight cache: 10 dakika
}));
```

### Adım 3: Preflight Options Handler

Express CORS middleware bunu otomatik hallediyor ama explicit yapmak daha güvenli:

```javascript
// OPTIONS preflight isteklerini hızlıca cevapla
app.options('*', cors());
```

### Adım 4: Cloudflare CORS Uyumluluğu

Cloudflare da kendi CORS header'larını ekleyebilir. İkili header sorununu önlemek için:
- Cloudflare'da CORS rule'ları disable (backend yönetsin)
- VEYA Cloudflare rule'larını backend ile senkronize et

## Olası Sorunlar ve Çözümleri

| Sorun | Çözüm |
|-------|-------|
| WebSocket CORS | Socket.io'nun kendi CORS ayarı ayrı, kontrol et |
| Electron app (masaüstü) | Origin `null` gelir → `!origin` kontrolü ile izin |
| Mobile app | CORS tarayıcı mekanizması, native app'te yok |
| CDN / static files | Static dosyalar için CORS gerekli değil |

## Test Planı

1. ✅ `https://app.optima-hr.net` → API isteği çalışır
2. ✅ `https://admin.optima-hr.net` → API isteği çalışır
3. ✅ `https://evil.com` → CORS blocked
4. ✅ Postman/curl (origin yok) → çalışır
5. ✅ Localhost (dev) → çalışır
6. ✅ WebSocket bağlantısı → CORS hatası yok
7. ✅ Preflight (OPTIONS) → 200 OK, doğru header'lar

## Bağımlılıklar
- Yok (mevcut `cors` paketi zaten yüklü)

## Tahmini Süre
- Uygulama: ~15 dakika
- Test: ~20 dakika (tüm frontend'leri kontrol)
