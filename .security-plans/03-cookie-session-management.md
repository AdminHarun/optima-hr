# 03 — Oturum Süresi ve Cookie Yönetimi

## Konu Açıklaması

Session yönetimi, kullanıcı oturumlarının güvenli bir şekilde oluşturulması, sürdürülmesi ve sonlandırılmasını kapsar. Cookie bayrakları (httpOnly, secure, sameSite) ve JWT expire süreleri bu katmanın temelini oluşturur.

## Mevcut Durum Analizi

### Cookie Ayarları (auth.js):
```javascript
const getCookieOptions = () => ({
  httpOnly: true,           // ✅ XSS koruması
  secure: true,             // ✅ Sadece HTTPS
  sameSite: 'none',         // ⚠️ Cross-site için gerekli ama CSRF riski
  domain: '.optima-hr.net', // ✅ Subdomain paylaşımı
  maxAge: 8 * 60 * 60 * 1000, // ❌ 8 SAAT — çok uzun
  path: '/'
});
```

### JWT Ayarları:
```javascript
jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' }); // ❌ 8 saat
```

### Risk Senaryoları

| Senaryo | Mevcut | Risk |
|---------|--------|------|
| Kullanıcı bilgisayardan ayrılır | Cookie 8 saat geçerli | Başkası erişebilir |
| Cookie çalınır (XSS bypass) | 8 saat penceresi | Uzun süre kötüye kullanım |
| Paylaşılan bilgisayar | Cookie kalır | Sonraki kullanıcı erişir |
| Token refresh mekanizması | Yok | Re-login gerekli |
| Aktif oturum listesi | Yok | Çalınan oturum tespit edilemez |

## Teknik Arka Plan

### OWASP Session Management Önerileri:
1. **Kısa ömürlü access token** (15-30 dk) + uzun ömürlü refresh token
2. **İnaktivite timeout** — belirli süre hareketsizlik sonrası oturumu kapat
3. **Absolute timeout** — en uzun süre sonunda kesinlikle bitir
4. **Cookie bayrakları** — httpOnly, Secure, SameSite hepsi zorunlu
5. **Token rotation** — her refresh'te yeni token, eskisi geçersiz
6. **Logout** — server-side token invalidation (blacklist)

### Atlassian Session Yönetimi:
- Yapılandırılabilir session timeout (admin tarafından ayarlanır)
- İnaktivite tabanlı otomatik çıkış
- Aktif oturum izleme — admin panelinden görüntülenebilir
- IP değişikliği tespiti
- Manuel oturum sonlandırma

## Uygulama Planı

### Adım 1: Cookie ve JWT Süresini 30 Dakikaya İndir

```javascript
// auth.js
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.optima-hr.net' : undefined,
  maxAge: 30 * 60 * 1000, // 30 dakika
  path: '/'
});

// JWT oluşturma
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30m' });
```

### Adım 2: Frontend Auto-Refresh (Opsiyonel — Faz 2)

30 dakika kısa gelebilir. Sliding session mekanizması eklenebilir:

```javascript
// Frontend — her API isteğinde cookie otomatik yenilenir
// Backend — requireAuth middleware'inde başarılı doğrulamada cookie yenile
const requireAuth = async (req, res, next) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Token'ın %75'i geçmişse yenile (22.5 dk sonra)
    const tokenAge = Date.now() / 1000 - decoded.iat;
    const maxAge = 30 * 60; // 30 dakika saniye cinsinden
    if (tokenAge > maxAge * 0.75) {
      const newToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role },
        JWT_SECRET,
        { expiresIn: '30m' }
      );
      res.cookie(COOKIE_NAME, newToken, getCookieOptions());
    }
    
    next();
  } catch (error) { ... }
};
```

Bu sayede aktif kullanıcılar otomatik yenilenir, pasif oturumlar 30 dk sonra kapanır.

### Adım 3: JWT expiresIn ve Cookie maxAge Senkronizasyonu

JWT expiry ve cookie maxAge **aynı değerde** olmalı. Aksi halde:
- Cookie süresi dolmadan JWT expired olursa → kullanıcı cookie'si var ama erişemez (kötü UX)
- JWT süresi dolmadan cookie expired olursa → cookie gönderilmez, token kaybolur

```javascript
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 dakika
const SESSION_DURATION_STR = '30m';

// Cookie
maxAge: SESSION_DURATION_MS

// JWT
jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_DURATION_STR });
```

## Test Planı

1. ✅ Login sonrası cookie `maxAge` = ~1800000ms (30dk)
2. ✅ 30 dakika sonra API isteği → "Oturum süresi dolmuş" (ama 404 olarak maskelenmiş)
3. ✅ Aktif kullanım sırasında 22.5 dk sonra → cookie otomatik yenilenir
4. ✅ Admin paneli → login sonrası normal çalışır
5. ✅ Kariyer portalı → başvuru akışı bozulmaz

## Bağımlılıklar
- Plan 05 (Hata Maskeleme) ile koordineli — expired mesajları

## Tahmini Süre
- Uygulama: ~20 dakika
- Test: ~15 dakika
