# 05 — MFA/2FA Zorunluluğu Mekanizması

## Konu Açıklaması

Multi-Factor Authentication (MFA), kullanıcının bildiği (şifre) ve sahip olduğu (telefondaki authenticator app) iki ayrı faktörle kimlik doğrulaması yapmasını sağlar. Admin paneli gibi yüksek yetkili erişim noktalarında MFA zorunlu olmalıdır.

## Mevcut Durum

- `AdminUser` modelinde `two_factor_enabled` ve `two_factor_secret` alanları **var**
- Ancak uygulamada TOTP doğrulama **aktif değil** — login sadece email+şifre ile çalışıyor
- 2FA setup akışı (QR code oluşturma, doğrulama) **implemente edilmemiş**
- Admin portalında 2FA ayarı UI'da var ama backend'i bağlı değil

## Teknik Arka Plan

### TOTP (Time-based One-Time Password) Nasıl Çalışır:
1. Admin 2FA'yı aktif eder → sunucu benzersiz bir **secret key** üretir
2. Secret key → QR kodu olarak gösterilir
3. Kullanıcı Google Authenticator / Authy ile tarar
4. Uygulama 30 saniyede bir 6 haneli kod üretir
5. Login sırasında: şifre + 6 haneli kod birlikte doğrulanır

### Kütüphane Seçimi

| Kütüphane | Durum | Özellikler |
|-----------|-------|------------|
| `speakeasy` | ⚠️ Bakımsız (3+ yıl güncelleme yok) | Yaygın kullanım, basit API |
| `otplib` | ⚠️ Bakımsız | Modern API, TypeScript desteği |
| `otpauth` | ✅ Aktif bakılıyor | RFC 6238 uyumlu, güvenli |

**Önerimiz: `otpauth`** — aktif bakılan, modern ve güvenli.

### Atlassian MFA:
- Organizasyon genelinde zorunlu kılınabilir
- Backup kurtarma kodları sağlar
- Kontekstüel 2FA — hassas işlemlerde ek doğrulama
- Admin tarafından tüm kullanıcıların 2FA durumu izlenebilir

## Uygulama Planı

### Adım 1: Bağımlılık Kurulumu

```bash
npm install otpauth qrcode
```

### Adım 2: 2FA Setup Endpoint'leri

```javascript
// routes/auth.js — 2FA kurulum

// 1. Secret üret ve QR kodu döndür
router.post('/2fa/setup', requireAuth, async (req, res) => {
  const { TOTP } = require('otpauth');

  const totp = new TOTP({
    issuer: 'Optima HR',
    label: req.user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: TOTP.generateSecret()  // Kriptografik rastgele
  });

  // Secret'ı geçici olarak kaydet (doğrulanana kadar aktif olmaz)
  await AdminUser.update(
    { two_factor_secret: totp.secret.base32 },
    { where: { id: req.user.id } }
  );

  // QR kodu oluştur
  const QRCode = require('qrcode');
  const qrDataUrl = await QRCode.toDataURL(totp.toString());

  // Backup kodları üret
  const crypto = require('crypto');
  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString('hex')
  );

  // Backup kodları hashle ve kaydet
  const bcrypt = require('bcryptjs');
  const hashedCodes = await Promise.all(
    backupCodes.map(code => bcrypt.hash(code, 10))
  );
  await AdminUser.update(
    { two_factor_backup_codes: JSON.stringify(hashedCodes) },
    { where: { id: req.user.id } }
  );

  res.json({
    qrCode: qrDataUrl,
    manualKey: totp.secret.base32,
    backupCodes  // Sadece bu sefer gösterilecek
  });
});

// 2. 2FA doğrulama ve aktivasyon
router.post('/2fa/verify', requireAuth, async (req, res) => {
  const { code } = req.body;
  const user = await AdminUser.findByPk(req.user.id);

  const { TOTP } = require('otpauth');
  const totp = new TOTP({
    secret: user.two_factor_secret
  });

  const isValid = totp.validate({ token: code, window: 1 }) !== null;

  if (!isValid) {
    return res.status(400).json({ error: 'Geçersiz kod' });
  }

  await user.update({ two_factor_enabled: true });
  res.json({ success: true, message: '2FA aktif edildi' });
});
```

### Adım 3: Login Akışına 2FA Entegrasyonu

```javascript
// auth.js login endpoint'inde
if (user.two_factor_enabled) {
  // Şifre doğruysa, 2FA kodu iste
  if (!twoFactorCode) {
    return res.json({
      requires2FA: true,
      message: 'İki faktörlü doğrulama kodu gerekli'
    });
  }

  // TOTP doğrulama
  const { TOTP } = require('otpauth');
  const totp = new TOTP({ secret: user.two_factor_secret });
  const isValid = totp.validate({ token: twoFactorCode, window: 1 }) !== null;

  if (!isValid) {
    // Backup kod kontrolü
    const backupValid = await checkBackupCode(user, twoFactorCode);
    if (!backupValid) {
      return res.status(401).json({ error: 'Geçersiz 2FA kodu' });
    }
  }
}
```

### Adım 4: 2FA Zorunluluk Mekanizması

```javascript
// OrganizationSettings'e ekle
// key: "security.require2FA", value: true

// Login middleware — 2FA zorunluysa ve kullanıcı aktif etmemişse uyarı ver
if (orgSettings.require2FA && !user.two_factor_enabled) {
  return res.json({
    success: true,
    token: token,  // Giriş izni ver ama...
    needs2FASetup: true,  // Frontend'de zorunlu kurulum göster
    message: 'Güvenlik politikası gereği 2FA kurulumu zorunludur'
  });
}
```

### Adım 5: Frontend UI

**Admin Portal (frontend-portal):**
- Güvenlik ayarları sayfasında "2FA Zorunlu" toggle (zaten var, backend bağlanacak)
- Kullanıcı profil sayfasında 2FA kurulum modal'ı
- QR kod gösterimi + backup kodlar

**Admin Panel (frontend-admin):**
- Login formunda 2FA kod input'u (şifre doğruysa görünür)
- Profil ayarlarında 2FA yönetimi

## AdminUser Model Değişiklikleri

```javascript
// Mevcut alanlar (zaten var):
two_factor_enabled: DataTypes.BOOLEAN,
two_factor_secret: DataTypes.STRING,

// Yeni alanlar:
two_factor_backup_codes: {
  type: DataTypes.TEXT,  // JSON string olarak hashlenmiş backup kodlar
  allowNull: true
}
```

## Test Planı

1. ✅ `POST /api/auth/2fa/setup` → QR kodu ve backup kodlar döner
2. ✅ `POST /api/auth/2fa/verify` → doğru kod ile 2FA aktif olur
3. ✅ 2FA aktifken login → `requires2FA: true` döner
4. ✅ 2FA kodu ile login → başarılı giriş
5. ✅ Yanlış 2FA kodu → "Geçersiz 2FA kodu"
6. ✅ Backup kod ile login → çalışır, kod tüketilir
7. ✅ 2FA zorunlu + kullanıcı 2FA yok → `needs2FASetup: true`

## Bağımlılıklar
- Plan 03 (Cookie/Session) tamamlanmış olmalı
- `npm install otpauth qrcode` gerekli

## Tahmini Süre
- Backend: ~60 dakika
- Frontend UI: ~45 dakika
- Test: ~30 dakika
