# 10 — Audit Log Zenginleştirme

## Konu Açıklaması

Audit logging, sistemdeki tüm kritik işlemlerin kim tarafından, ne zaman, nereden yapıldığını kayıt altına alır. KVKK ve GDPR uyumluluğu için zorunludur. Mevcut audit log yapısını genişletip eksik loglamaları ekliyoruz.

## Mevcut Durum

### Şu an loglanan aksiyonlar:
- ✅ `login` — başarılı giriş (auth.js)
- ✅ `settings.update` — ayar değişikliği (admin.js)

### Loglanmayan kritik aksiyonlar:
- ❌ Başarısız login denemeleri
- ❌ Logout
- ❌ Kullanıcı oluşturma/silme
- ❌ Başvuru durumu değiştirme (pending → accepted/rejected)
- ❌ Başvuru silme
- ❌ Profil görüntüleme (veri erişim logu)
- ❌ Davet oluşturma/silme
- ❌ 2FA aktif/deaktif etme
- ❌ Dosya indirme (CV, test dosyaları)
- ❌ Toplu veri erişimi (profil/başvuru listeleme)

### Mevcut AuditLog Model Alanları:
```javascript
action, module, user_id, user_email, user_name,
ip_address, user_agent, request_method, request_url,
response_status, details (JSONB)
```
Model yeterli — sadece loglamayı yaymamız gerekiyor.

## Teknik Arka Plan

### KVKK/GDPR Audit Log Gereksinimleri:
1. **Kim** — user_id, user_email (logda kişisel veri minimizasyonu)
2. **Ne** — action tipi ve hedef kaynak
3. **Ne zaman** — timestamp (otomatik)
4. **Nereden** — IP adresi, user agent
5. **Sonuç** — başarılı/başarısız
6. **Değişiklik** — before/after state (settings için)

### Neleri Loglamamalıyız:
- ❌ Şifreleri veya hash'leri
- ❌ Token değerlerini
- ❌ TC kimlik numarası tam halini
- ❌ Request/response body'nin tamamını
- ❌ Session token'ları

## Uygulama Planı

### Adım 1: Audit Log Helper'ı Güncelle

Mevcut `logAction` fonksiyonunu merkezi bir util'e taşıyoruz:

```javascript
// utils/auditLogger.js
const AuditLog = require('../models/AuditLog');

const auditLog = async (req, action, module, details = {}) => {
  try {
    await AuditLog.create({
      action,
      module,
      user_id: req.user?.id || null,
      user_email: req.user?.email || null,
      user_name: req.user ?
        `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() :
        (details.actorName || 'system'),
      ip_address: req.headers['cf-connecting-ip'] ||
                  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                  req.ip,
      user_agent: req.headers['user-agent'],
      request_method: req.method,
      request_url: req.originalUrl,
      response_status: details.status || 200,
      details: {
        ...details,
        // Hassas veri maskeleme
        password: undefined,
        token: undefined,
        secret: undefined
      }
    });
  } catch (err) {
    console.error('Audit log hatası:', err.message);
    // Audit log hatası işlem akışını engellememeli
  }
};

module.exports = auditLog;
```

### Adım 2: Auth Route'larına Log Ekleme

```javascript
// routes/auth.js

// Başarılı login — zaten var, güncelle
auditLog(req, 'login.success', 'auth', {
  origin: req.headers.origin,
  method: '2fa' | 'password'
});

// Başarısız login — ❌ EKSİK
auditLog(req, 'login.failed', 'auth', {
  reason: 'invalid_password' | 'user_not_found' | 'account_locked',
  email: req.body.email  // Hangi hesap denendiğini logla
});

// Logout
auditLog(req, 'logout', 'auth', {});

// 2FA setup
auditLog(req, '2fa.enabled', 'auth', {});
auditLog(req, '2fa.disabled', 'auth', {});
```

### Adım 3: Applications Route'larına Log Ekleme

```javascript
// routes/applications.js

// Başvuru durumu değişikliği
router.put('/:id/status', async (req, res) => {
  // ...mevcut kod...
  auditLog(req, 'application.status_changed', 'applications', {
    applicationId: id,
    oldStatus: application.status,
    newStatus: status,
    rejectReason: rejectReason || null
  });
});

// Başvuru silme
router.delete('/:id', async (req, res) => {
  auditLog(req, 'application.deleted', 'applications', {
    applicationId: id,
    applicantEmail: application.applicant_profile?.email
  });
});

// Toplu veri erişimi (isteğe bağlı — yüksek hacim üretebilir)
router.get('/profiles/all', async (req, res) => {
  auditLog(req, 'profiles.list_viewed', 'applications', {
    count: profiles.length,
    siteCode: siteCode
  });
});
```

### Adım 4: Invitations Route'larına Log Ekleme

```javascript
// routes/invitations.js

// Davet oluşturma
router.post('/', async (req, res) => {
  auditLog(req, 'invitation.created', 'invitations', {
    email: email,
    siteCode: siteCode
  });
});

// Davet silme
router.delete('/:id', async (req, res) => {
  auditLog(req, 'invitation.deleted', 'invitations', {
    invitationId: id,
    email: invitation.email
  });
});
```

### Adım 5: Middleware Bazlı Otomatik Loglama (Faz 2)

Kritik route'lara middleware ile otomatik log:

```javascript
// middleware/auditMiddleware.js
const auditLog = require('../utils/auditLogger');

const auditActions = {
  'DELETE': 'resource.deleted',
  'PUT': 'resource.updated',
  'POST': 'resource.created'
};

const autoAudit = (module) => (req, res, next) => {
  // Response tamamlandığında logla
  res.on('finish', () => {
    if (['DELETE', 'PUT', 'POST'].includes(req.method)) {
      auditLog(req, auditActions[req.method], module, {
        statusCode: res.statusCode
      });
    }
  });
  next();
};
```

## Log Seviyesi Matrisi

| Aksiyon | Seviye | Log? |
|---------|:------:|:----:|
| Login başarılı | INFO | ✅ Her zaman |
| Login başarısız | WARN | ✅ Her zaman |
| Başvuru durum değişikliği | INFO | ✅ Her zaman |
| Başvuru/Profil silme | WARN | ✅ Her zaman |
| Ayar değişikliği | INFO | ✅ Her zaman |
| 2FA aktif/deaktif | INFO | ✅ Her zaman |
| Davet oluşturma/silme | INFO | ✅ Her zaman |
| Liste görüntüleme | DEBUG | 🟡 Opsiyonel |
| Tekil kayıt görüntüleme | DEBUG | 🟡 Opsiyonel |

## Test Planı

1. ✅ Başarısız login → audit log'da kayıt var
2. ✅ Başvuru durumu değiştirildi → audit log'da before/after state
3. ✅ Başvuru silindi → audit log'da kayıt
4. ✅ Davet oluşturuldu → audit log'da kayıt
5. ✅ Admin portalı audit log sayfasında yeni kayıtlar görünüyor
6. ✅ Log'larda hassas veri yok (şifre, token maskelenmiş)

## Bağımlılıklar
- `utils/auditLogger.js` oluşturulmalı
- Mevcut `AuditLog` modeli yeterli

## Tahmini Süre
- Uygulama: ~35 dakika
- Test: ~15 dakika
