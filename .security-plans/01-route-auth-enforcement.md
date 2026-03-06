# 01 — Route Auth Zorunluluğu (Public → Protected Migration)

## Konu Açıklaması

OWASP API Security Top 10'da **API1:2023 (Broken Object Level Authorization)** ve **API2:2023 (Broken Authentication)** ilk sıralarda yer alır. Auth middleware uygulanmamış API endpoint'leri, saldırganların kimlik doğrulaması olmadan tüm verilere erişmesini sağlar.

## Mevcut Durum Analizi

### Sorun
`server.js` satır 120-121:
```javascript
// PUBLIC ROUTES - Auth gerektirmeyen
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/applications', require('./routes/applications'));
```

Bu route'lar `requireAuth` middleware olmadan mount edilmiş. Herhangi biri cookie/token olmadan:
- `GET /api/invitations` → Tüm davet linklerini görebilir
- `GET /api/applications` → Tüm başvuruları (TC, email, telefon) görebilir
- `GET /api/applications/profiles` → Tüm profilleri + token'ları görebilir

### Risk Senaryoları

| Senaryo | Etki | Olasılık |
|---------|------|----------|
| Saldırgan tüm başvuran TC'lerini çeker | KVKK ihlali, para cezası | 🔴 Yüksek |
| Davet token'ları çalınır, sahte başvurular yapılır | Veri bütünlüğü bozulur | 🔴 Yüksek |
| Session token çalınır, başvuran hesabı ele geçirilir | Kimlik hırsızlığı | 🔴 Yüksek |
| Rakip firma tüm adayları görür | İş sırrı sızıntısı | 🟡 Orta |
| Toplu veri çekme (scraping) otomatize edilir | Kapasite tüketimi + veri sızıntısı | 🟡 Orta |

## Teknik Arka Plan (OWASP)

### Broken Authentication koruması nasıl yapılır:
1. **Tüm API endpoint'lerine auth middleware uygula** — hiçbir hassas endpoint public kalmamalı
2. **Public endpoint'leri izole et** — ayrı router dosyasına taşı
3. **Minimum veri ilkesi** — public endpoint bile olsa sadece gerekli veriyi döndür
4. **Yetkilendirme kontrolleri** — her endpoint'te kullanıcının o veriye erişim hakkı var mı kontrol et

### Atlassian yaklaşımı:
- OAuth 2.0 zorunlu — hiçbir API key'siz erişim yok
- Scoped token'lar — token sadece belirli işlemlere izin verir
- Organizasyon seviyesinde yönetim — admin panelinden tüm token'lar yönetilebilir

## Uygulama Planı

### Adım 1: Public endpoint'leri ayır

`applicationsPublic.js` dosyası oluştur — sadece başvuranın kullanacağı minimum endpoint'ler:

```javascript
// routes/applicationsPublic.js
const router = require('express').Router();

// Başvuran girişi — public olmalı
router.post('/applicant-login', ...);

// Güvenlik sorusu — public olmalı  
router.post('/get-security-question', ...);

// Session doğrulama — applicant kendi session'ını kontrol ediyor
router.get('/session/:sessionToken', ...);
// NOT: Response'ta sadece id, firstName, lastName, valid döndürecek
// chatToken, sessionToken, IP BİLGİSİ DÖNMEYECEK

// Chat token doğrulama
router.get('/chat/:chatToken', ...);
// NOT: Minimum veri — sadece id, firstName, valid

// Başvuru formu gönderme
router.post('/submit', ...);
// Bu endpoint zaten token validation yapıyor

// Davet token doğrulama
router.get('/validate-invitation/:token', ...);
router.post('/mark-invitation-used/:token', ...);
```

### Adım 2: Ana route'ları protected yap

```javascript
// server.js
// PUBLIC — sadece applicant endpoints
app.use('/api/apply', require('./routes/applicationsPublic'));

// PROTECTED — admin endpoints
app.use('/api/invitations', requireAuth, require('./routes/invitations'));
app.use('/api/applications', requireAuth, require('./routes/applications'));
```

### Adım 3: Frontend güncellemesi

Admin panelindeki (`frontend-admin`) API çağrıları zaten cookie ile gidiyor → değişiklik gerekmez.

Aday tarafındaki çağrılar `/api/applications/...` yerine `/api/apply/...` olarak güncellenmeli.

**Etkilenen frontend dosyalar:**
- `applicationService.js` → API base URL'leri `/api/apply/` olarak değişecek
- `invitationService.js` → `/api/apply/validate-invitation/` olacak

## Test Planı

1. ✅ Cookie olmadan `GET /api/invitations` → 404
2. ✅ Cookie olmadan `GET /api/applications` → 404
3. ✅ Cookie olmadan `GET /api/applications/profiles` → 404
4. ✅ Cookie ile login sonrası `GET /api/applications` → normal çalışır
5. ✅ Aday tarafı: `/api/apply/applicant-login` → auth olmadan çalışır
6. ✅ Aday tarafı: `/api/apply/validate-invitation/:token` → çalışır
7. ✅ Aday tarafı: `/api/apply/submit` → form gönderme çalışır
8. ✅ Admin paneli: tüm sayfalar normal açılır

## Bağımlılıklar
- Yok (ilk adım, diğer planlardan bağımsız)

## Tahmini Süre
- Uygulama: ~30 dakika
- Test: ~15 dakika
