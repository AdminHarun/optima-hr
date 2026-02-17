# 🚀 PHASE 3: GÜVENLİK & KURUMSAL ÖZELLİKLER
## RBAC, 2FA, Audit Logging, SSO (2 hafta)

---

## 📌 TASK 3.1: RBAC (ROLE BASED ACCESS CONTROL)

### 🤖 Claude Prompt

```
GÖREV: Rol tabanlı yetkilendirme sistemi (RBAC) ekle

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Roller (admin, manager, employee), izinler, kaynak bazlı erişim kontrolü

DATABASE SCHEMA:

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  site_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE, -- 'tasks.create', 'tasks.edit', 'users.manage'
  resource VARCHAR(100) NOT NULL, -- 'tasks', 'users', 'files', 'channels'
  action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete', 'manage'
  description TEXT
);

CREATE TABLE role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE employee_roles (
  employee_id INTEGER REFERENCES employees_employee(employee_id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, role_id)
);

-- Default roles seed
INSERT INTO roles (name, display_name, description) VALUES
('super_admin', 'Süper Admin', 'Tüm yetkilere sahip'),
('admin', 'Admin', 'Site yöneticisi'),
('manager', 'Yönetici', 'Ekip yöneticisi'),
('employee', 'Çalışan', 'Standart kullanıcı'),
('guest', 'Misafir', 'Sınırlı erişim');

-- Default permissions
INSERT INTO permissions (name, resource, action, description) VALUES
('tasks.create', 'tasks', 'create', 'Görev oluşturabilir'),
('tasks.edit.own', 'tasks', 'edit', 'Kendi görevlerini düzenleyebilir'),
('tasks.edit.all', 'tasks', 'edit', 'Tüm görevleri düzenleyebilir'),
('tasks.delete', 'tasks', 'delete', 'Görev silebilir'),
('users.view', 'users', 'read', 'Kullanıcıları görüntüleyebilir'),
('users.manage', 'users', 'manage', 'Kullanıcı yönetimi yapabilir'),
('files.upload', 'files', 'create', 'Dosya yükleyebilir'),
('files.delete', 'files', 'delete', 'Dosya silebilir'),
('channels.create', 'channels', 'create', 'Kanal oluşturabilir'),
('channels.manage', 'channels', 'manage', 'Kanal yönetimi yapabilir');

BACKEND MIDDLEWARE:

```javascript
// backend-express/middleware/rbac.js
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const { employeeId } = req.user;

      // Employee'nin rollerini ve izinlerini getir
      const employee = await Employee.findByPk(employeeId, {
        include: [{
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          include: [{
            model: Permission,
            as: 'permissions',
            through: { attributes: [] }
          }]
        }]
      });

      // İzinleri kontrol et
      const hasPermission = employee.roles.some(role =>
        role.permissions.some(perm => perm.name === requiredPermission)
      );

      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('RBAC error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

module.exports = { checkPermission };
```

BACKEND ROUTES USAGE:

```javascript
// backend-express/routes/tasks.js
const { checkPermission } = require('../middleware/rbac');

router.post('/', authenticate, checkPermission('tasks.create'), async (req, res) => {
  // Görev oluşturma
});

router.put('/:id', authenticate, checkPermission('tasks.edit.all'), async (req, res) => {
  // Görev güncelleme
});

router.delete('/:id', authenticate, checkPermission('tasks.delete'), async (req, res) => {
  // Görev silme
});
```

FRONTEND:

```jsx
// frontend/src/hooks/usePermission.js
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const usePermission = (permission) => {
  const { user } = useContext(AuthContext);
  
  if (!user || !user.roles) return false;
  
  return user.roles.some(role =>
    role.permissions.some(perm => perm.name === permission)
  );
};

// Kullanım:
const canCreateTask = usePermission('tasks.create');

{canCreateTask && (
  <Button onClick={handleCreateTask}>Görev Oluştur</Button>
)}
```

ADMIN PANEL - ROL YÖNETİMİ:

```jsx
// frontend/src/pages/admin/RoleManagement.js
const RoleManagement = () => {
  // Rol listesi
  // Rol oluşturma/düzenleme
  // İzin atama (checkbox list)
  // Kullanıcılara rol atama
};
```

BEKLENEN ÇIKTI:
- RBAC sistemi çalışıyor
- Middleware ile endpoint koruması
- Frontend'de izin kontrolü
- Admin panel'de rol yönetimi
```

---

## 📌 TASK 3.2: 2FA/MFA SİSTEMİ

### 🤖 Claude Prompt

```
GÖREV: İki faktörlü kimlik doğrulama (2FA) ekle

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: TOTP (Time-based OTP) kullanarak 2FA

DATABASE:

CREATE TABLE two_factor_auth (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees_employee(employee_id) ON DELETE CASCADE UNIQUE,
  secret VARCHAR(255) NOT NULL, -- TOTP secret (encrypted)
  backup_codes TEXT[], -- Backup codes (encrypted)
  enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

BACKEND:

Kütüphane: otplib, qrcode

```javascript
// backend-express/routes/auth.js
const speakeasy = require('otplib');
const QRCode = require('qrcode');

// 2FA setup başlat
router.post('/2fa/setup', authenticate, async (req, res) => {
  const { employeeId } = req.user;
  
  // Secret oluştur
  const secret = speakeasy.authenticator.generateSecret();
  
  // QR code URL
  const otpauthUrl = speakeasy.authenticator.keyuri(
    req.user.email,
    'Optima HR',
    secret.base32
  );
  
  // QR code image
  const qrCodeImage = await QRCode.toDataURL(otpauthUrl);
  
  // DB'ye kaydet (henüz enabled=false)
  await TwoFactorAuth.create({
    employee_id: employeeId,
    secret: encrypt(secret.base32),
    enabled: false
  });
  
  res.json({
    secret: secret.base32,
    qrCode: qrCodeImage
  });
});

// 2FA verify ve aktif et
router.post('/2fa/verify', authenticate, async (req, res) => {
  const { token } = req.body;
  const { employeeId } = req.user;
  
  const twoFA = await TwoFactorAuth.findOne({ where: { employee_id: employeeId } });
  if (!twoFA) return res.status(404).json({ error: '2FA not set up' });
  
  const secret = decrypt(twoFA.secret);
  const isValid = speakeasy.authenticator.verify({ token, secret });
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // 2FA'yı aktif et ve backup codes oluştur
  const backupCodes = generateBackupCodes(); // 10 adet 8 haneli kod
  
  await twoFA.update({
    enabled: true,
    verified_at: new Date(),
    backup_codes: backupCodes.map(code => encrypt(code))
  });
  
  res.json({ 
    success: true, 
    backupCodes // Kullanıcıya göster, bir daha gösterilmeyecek
  });
});

// Login ile 2FA kontrolü
router.post('/login', async (req, res) => {
  const { email, password, twoFactorToken } = req.body;
  
  // ... email/password doğrulama ...
  
  // 2FA kontrolü
  const twoFA = await TwoFactorAuth.findOne({ 
    where: { employee_id: employee.employee_id, enabled: true }
  });
  
  if (twoFA) {
    if (!twoFactorToken) {
      return res.status(202).json({ requires2FA: true });
    }
    
    const secret = decrypt(twoFA.secret);
    const isValid = speakeasy.authenticator.verify({ 
      token: twoFactorToken, 
      secret 
    });
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }
  }
  
  // Token oluştur ve döndür
  // ...
});
```

FRONTEND:

```jsx
// frontend/src/pages/Settings/TwoFactorAuth.js
const TwoFactorAuth = () => {
  const [step, setStep] = useState(1); // 1: Setup, 2: QR Scan, 3: Verify, 4: Backup Codes
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  const handleSetup = async () => {
    const res = await axios.post('/api/auth/2fa/setup');
    setQrCode(res.data.qrCode);
    setStep(2);
  };

  const handleVerify = async (token) => {
    const res = await axios.post('/api/auth/2fa/verify', { token });
    setBackupCodes(res.data.backupCodes);
    setStep(4);
  };

  return (
    <div>
      {step === 1 && <Button onClick={handleSetup}>2FA'yı Aktif Et</Button>}
      {step === 2 && <img src={qrCode} alt="QR Code" />}
      {step === 3 && <TextField label="6 haneli kod" onChange={...} />}
      {step === 4 && <BackupCodesList codes={backupCodes} />}
    </div>
  );
};
```

BEKLENEN ÇIKTI:
- 2FA setup çalışıyor
- QR code ile authenticator app bağlantısı
- Login'de 2FA kontrolü
- Backup codes
```

---

## 📌 TASK 3.3: DETAYLI AUDIT LOGGING

### 🤖 Claude Prompt

```
GÖREV: Detaylı audit log sistemi

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Mevcut: audit_logs tablosu var ama sınırlı
- Hedef: Tüm kritik işlemlerin loglanması

DATABASE ENHANCEMENT:

ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN request_method VARCHAR(10);
ALTER TABLE audit_logs ADD COLUMN request_url TEXT;
ALTER TABLE audit_logs ADD COLUMN request_body JSONB;
ALTER TABLE audit_logs ADD COLUMN response_status INTEGER;
ALTER TABLE audit_logs ADD COLUMN duration_ms INTEGER;

CREATE INDEX idx_audit_logs_employee ON audit_logs(employee_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

BACKEND MIDDLEWARE:

```javascript
// backend-express/middleware/auditLogger.js
const auditLogger = (action, resourceType) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Response'u intercept et
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      
      // Audit log kaydet
      AuditLog.create({
        employee_id: req.user?.employeeId,
        action,
        resource_type: resourceType,
        resource_id: req.params.id || null,
        details: {
          method: req.method,
          url: req.originalUrl,
          body: req.body,
          query: req.query,
          ip: req.ip,
          userAgent: req.get('user-agent')
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        request_method: req.method,
        request_url: req.originalUrl,
        response_status: res.statusCode,
        duration_ms: duration,
        site_code: req.user?.siteCode
      }).catch(err => console.error('Audit log error:', err));
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Kullanım:
router.delete('/:id', authenticate, auditLogger('DELETE', 'task'), checkPermission('tasks.delete'), async (req, res) => {
  // ...
});
```

FRONTEND - AUDIT LOG VIEWER (Admin):

```jsx
// frontend/src/pages/admin/AuditLogs.js
const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    employee: null,
    action: null,
    dateRange: [null, null]
  });

  // Filtreleme, sayfalama
  // Tablo görünümü: timestamp, user, action, resource, details

  return (
    <DataGrid
      rows={logs}
      columns={[
        { field: 'created_at', headerName: 'Zaman', width: 180 },
        { field: 'employee_name', headerName: 'Kullanıcı', width: 150 },
        { field: 'action', headerName: 'İşlem', width: 120 },
        { field: 'resource_type', headerName: 'Kaynak', width: 120 },
        { field: 'ip_address', headerName: 'IP', width: 130 },
        { field: 'details', headerName: 'Detay', width: 200, renderCell: (params) => (
          <Button onClick={() => showDetails(params.value)}>Detay</Button>
        )}
      ]}
    />
  );
};
```

BEKLENEN ÇIKTI:
- Tüm kritik işlemler loglanıyor
- Admin audit log görüntüleme sayfası
- Filtreleme (kullanıcı, tarih, işlem)
- IP ve user agent kaydı
```

---

## 📌 TASK 3.4: SSO (SINGLE SIGN-ON) ENTEGRASYONU

### 🤖 Claude Prompt

```
GÖREV: SSO (OAuth2 / SAML) entegrasyonu ekle

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Google OAuth2 ve SAML desteği

BACKEND:

Kütüphane: passport, passport-google-oauth20, passport-saml

```javascript
// backend-express/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const SamlStrategy = require('passport-saml').Strategy;

// Google OAuth2
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    // Google profiliyle user bul veya oluştur
    const email = profile.emails[0].value;
    let employee = await Employee.findOne({ where: { email } });
    
    if (!employee) {
      // Otomatik kayıt (eğer izin veriliyorsa)
      employee = await Employee.create({
        email,
        first_name: profile.name.givenName,
        last_name: profile.name.familyName,
        google_id: profile.id
      });
    }
    
    done(null, employee);
  }
));

// SAML
passport.use(new SamlStrategy({
    entryPoint: process.env.SAML_ENTRY_POINT,
    issuer: process.env.SAML_ISSUER,
    callbackUrl: '/api/auth/saml/callback',
    cert: process.env.SAML_CERT
  },
  async (profile, done) => {
    // SAML profiliyle user bul
    // ...
  }
));

// Routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google'), (req, res) => {
  // Token oluştur ve frontend'e yönlendir
  const token = generateJWT(req.user);
  res.redirect(`/auth/callback?token=${token}`);
});

router.post('/auth/saml', passport.authenticate('saml'));
router.post('/auth/saml/callback', passport.authenticate('saml'), (req, res) => {
  // ...
});
```

FRONTEND:

```jsx
// frontend/src/pages/Login.js
const Login = () => {
  return (
    <div>
      <Button onClick={() => window.location.href = '/api/auth/google'}>
        Google ile Giriş
      </Button>
      
      <Button onClick={() => window.location.href = '/api/auth/saml'}>
        SSO ile Giriş
      </Button>
    </div>
  );
};
```

BEKLENEN ÇIKTI:
- Google OAuth2 login çalışıyor
- SAML login çalışıyor
- SSO ile otomatik user oluşturma (opsiyonel)
```

---

## 📌 TASK 3.5: DATA RETENTION POLİTİKALARI

### 🤖 Claude Prompt

```
GÖREV: Veri saklama politikaları (eski mesajlar, loglar silme)

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Eski verileri otomatik temizleme

BACKEND CRON JOB:

```javascript
// backend-express/jobs/dataRetention.js
const cron = require('node-cron');

// Her gün gece 2'de çalış
cron.schedule('0 2 * * *', async () => {
  console.log('Running data retention job...');
  
  // 1. 90 günden eski audit log'ları sil
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await AuditLog.destroy({
    where: { created_at: { [Op.lt]: ninetyDaysAgo } }
  });
  
  // 2. 1 yıldan eski arşivlenmiş mesajları sil
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  await ChatMessage.destroy({
    where: { 
      created_at: { [Op.lt]: oneYearAgo },
      archived: true
    }
  });
  
  // 3. Teslim edilmiş veya 30 günden eski message queue kayıtlarını sil
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await MessageQueue.destroy({
    where: {
      [Op.or]: [
        { status: 'delivered' },
        { created_at: { [Op.lt]: thirtyDaysAgo } }
      ]
    }
  });
  
  console.log('Data retention job completed.');
});
```

BEKLENEN ÇIKTI:
- Cron job çalışıyor
- Eski veriler otomatik temizleniyor
```

---

## ✅ PHASE 3 Tamamlanma Checklist

- [ ] TASK 3.1: RBAC sistemi
- [ ] TASK 3.2: 2FA/MFA
- [ ] TASK 3.3: Audit logging
- [ ] TASK 3.4: SSO entegrasyonu
- [ ] TASK 3.5: Data retention

**PHASE 3 tamamlandıktan sonra PHASE 4'e geç!**

---
