/**
 * Two-Factor Authentication (2FA) Routes
 * TOTP tabanlı - Google Authenticator, Authy, Microsoft Authenticator uyumlu
 *
 * Kütüphane: otpauth (RFC 6238 uyumlu, aktif bakılıyor)
 *
 * Public endpoints (cookie/token gerekmez):
 *   POST /api/2fa/verify      — login sırasında TOTP doğrula + cookie ver
 *   POST /api/2fa/check       — kullanıcının 2FA gerektirip gerektirmediğini kontrol et
 *
 * Protected endpoints (requireAuth gerekir):
 *   POST /api/2fa/setup       — QR kodu + secret üret
 *   POST /api/2fa/verify-setup — ilk doğrulama ile 2FA aktifleştir
 *   POST /api/2fa/disable     — 2FA devre dışı bırak
 *   POST /api/2fa/backup-codes — yeni backup kodlar üret
 *   GET  /api/2fa/status      — kullanıcının 2FA durumu
 */

const express = require('express');
const router = express.Router();
const OTPAuth = require('otpauth');
const QRCode = require('qrcode');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../middleware/requireAuth');
const AdminUser = require('../models/AdminUser');
const Employee = require('../models/Employee');

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('⚠️  JWT_SECRET env var tanımlanmamış!');
  return require('crypto').randomBytes(64).toString('hex');
})();
const JWT_EXPIRES_IN = '30m';
const COOKIE_NAME = 'optima_token';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.optima-hr.net' : undefined,
  maxAge: 30 * 60 * 1000,
  path: '/'
});

const getClientIP = require('../utils/getClientIP');

// ──────────────────────────────────────────────────────────────
// PUBLIC: POST /api/2fa/check
// Login öncesi — kullanıcının 2FA aktif mi kontrol et
// Body: { userId }
// ──────────────────────────────────────────────────────────────
router.post('/check', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Kullanıcı ID gerekli' });
    }

    const user = await AdminUser.findByPk(userId, {
      attributes: ['id', 'two_factor_enabled', 'is_active']
    });

    if (!user || !user.is_active) {
      // Bilgi sızdırma önleme: geçersiz kullanıcı için de aynı format
      return res.json({ success: true, requires2FA: false });
    }

    res.json({
      success: true,
      requires2FA: user.two_factor_enabled
    });
  } catch (error) {
    console.error('[2FA] Check error:', error);
    res.status(500).json({ success: false, error: '2FA kontrolü başarısız' });
  }
});

// ──────────────────────────────────────────────────────────────
// PUBLIC: POST /api/2fa/verify
// Login sırasında TOTP kodunu doğrula → JWT cookie ver
// Body: { userId, token } veya { userId, backupCode }
// ──────────────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const { userId, token, backupCode } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Kullanıcı ID gerekli' });
    }

    if (!token && !backupCode) {
      return res.status(400).json({ success: false, error: 'Doğrulama kodu veya yedek kod gerekli' });
    }

    const user = await AdminUser.findByPk(userId, {
      include: [{ model: Employee, as: 'employee', required: false }]
    });

    if (!user || !user.is_active || !user.two_factor_enabled) {
      return res.status(401).json({ success: false, error: 'Geçersiz istek' });
    }

    let verified = false;

    // TOTP kodu ile doğrulama
    if (token) {
      const totp = new OTPAuth.TOTP({
        issuer: 'Optima HR',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.two_factor_secret)
      });

      const delta = totp.validate({ token: token.toString().replace(/\s/g, ''), window: 1 });
      verified = delta !== null;
    }

    // Backup kodu ile doğrulama
    if (!verified && backupCode) {
      const hashedInput = crypto.createHash('sha256').update(backupCode.toUpperCase().replace(/\s/g, '')).digest('hex');
      const backupCodes = JSON.parse(user.two_factor_backup_codes || '[]');
      const matchedIndex = backupCodes.findIndex(bc => bc.code === hashedInput && !bc.used);

      if (matchedIndex !== -1) {
        backupCodes[matchedIndex].used = true;
        await user.update({ two_factor_backup_codes: JSON.stringify(backupCodes) });
        verified = true;

        const remaining = backupCodes.filter(bc => !bc.used).length;
        if (remaining <= 2) {
          console.warn(`⚠️ [2FA] Kullanıcı ${user.email} için sadece ${remaining} yedek kod kaldı`);
        }
      }
    }

    if (!verified) {
      return res.status(401).json({ success: false, error: 'Geçersiz doğrulama kodu' });
    }

    // Doğrulama başarılı — JWT üret ve cookie ver
    const clientIP = getClientIP(req);
    const newVersion = (user.token_version || 0) + 1;

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      type: user.role === 'USER' ? 'employee' : 'admin',
      site_code: user.site_code,
      employee_id: user.employee_id || null,
      ip: clientIP,
      tv: newVersion
    };

    const jwtToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    await user.update({ last_login: new Date(), token_version: newVersion });

    res.cookie(COOKIE_NAME, jwtToken, getCookieOptions());

    const userData = user.toJSON();

    res.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        site_code: userData.site_code,
        avatar_url: userData.avatar_url,
        phone: userData.phone,
        is_active: userData.is_active,
        employee_id: userData.employee_id,
        two_factor_enabled: userData.two_factor_enabled,
        last_login: userData.last_login
      }
    });
  } catch (error) {
    console.error('[2FA] Verify error:', error);
    res.status(500).json({ success: false, error: '2FA doğrulama başarısız' });
  }
});

// ──────────────────────────────────────────────────────────────
// PROTECTED: POST /api/2fa/setup
// QR kod ve secret üret (henüz aktifleşmiyor)
// ──────────────────────────────────────────────────────────────
router.post('/setup', requireAuth, async (req, res) => {
  try {
    const user = await AdminUser.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }

    if (user.two_factor_enabled) {
      return res.status(400).json({
        success: false,
        error: '2FA zaten aktif. Önce devre dışı bırakın.'
      });
    }

    // Kriptografik güvenli secret üret (otpauth)
    const secret = new OTPAuth.Secret({ size: 20 });

    const totp = new OTPAuth.TOTP({
      issuer: 'Optima HR',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });

    // Secret'ı geçici kaydet (henüz enabled değil)
    await user.update({ two_factor_secret: secret.base32 });

    // QR kod oluştur (otpauth:// URI formatı — tüm authenticator uygulamaları destekler)
    const otpauthUri = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
      width: 250,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    res.json({
      success: true,
      data: {
        secret: secret.base32,        // Manuel giriş için
        qrCode: qrCodeDataUrl,        // QR kod data URL
        otpauthUri: otpauthUri        // Manuel URI
      }
    });
  } catch (error) {
    console.error('[2FA] Setup error:', error);
    res.status(500).json({ success: false, error: '2FA kurulumu başarısız' });
  }
});

// ──────────────────────────────────────────────────────────────
// PROTECTED: POST /api/2fa/verify-setup
// QR tarama sonrası kodu doğrula ve 2FA'yı aktifleştir
// Body: { token: "123456" }
// ──────────────────────────────────────────────────────────────
router.post('/verify-setup', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Doğrulama kodu gerekli' });
    }

    const user = await AdminUser.findByPk(req.user.id);
    if (!user || !user.two_factor_secret) {
      return res.status(400).json({ success: false, error: 'Önce 2FA kurulumunu başlatın' });
    }

    // TOTP doğrula
    const totp = new OTPAuth.TOTP({
      issuer: 'Optima HR',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.two_factor_secret)
    });

    const delta = totp.validate({ token: token.toString().replace(/\s/g, ''), window: 1 });
    if (delta === null) {
      return res.status(400).json({ success: false, error: 'Geçersiz doğrulama kodu. Lütfen tekrar deneyin.' });
    }

    // 10 adet backup kodu üret
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Backup kodları SHA-256 ile hashle
    const hashedBackupCodes = backupCodes.map(code => ({
      code: crypto.createHash('sha256').update(code).digest('hex'),
      used: false
    }));

    // 2FA aktifleştir
    await user.update({
      two_factor_enabled: true,
      two_factor_backup_codes: JSON.stringify(hashedBackupCodes)
    });

    res.json({
      success: true,
      message: '2FA başarıyla aktifleştirildi',
      backupCodes  // Kullanıcıya sadece bir kez gösterilir
    });
  } catch (error) {
    console.error('[2FA] Verify setup error:', error);
    res.status(500).json({ success: false, error: '2FA doğrulama başarısız' });
  }
});

// ──────────────────────────────────────────────────────────────
// PROTECTED: POST /api/2fa/disable
// 2FA devre dışı bırak (mevcut TOTP kodu ile)
// Body: { token: "123456" }
// ──────────────────────────────────────────────────────────────
router.post('/disable', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Mevcut doğrulama kodu gerekli' });
    }

    const user = await AdminUser.findByPk(req.user.id);
    if (!user || !user.two_factor_enabled) {
      return res.status(400).json({ success: false, error: '2FA zaten devre dışı' });
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'Optima HR',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.two_factor_secret)
    });

    const delta = totp.validate({ token: token.toString().replace(/\s/g, ''), window: 1 });
    if (delta === null) {
      return res.status(401).json({ success: false, error: 'Geçersiz doğrulama kodu' });
    }

    await user.update({
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_backup_codes: null
    });

    res.json({ success: true, message: '2FA devre dışı bırakıldı' });
  } catch (error) {
    console.error('[2FA] Disable error:', error);
    res.status(500).json({ success: false, error: '2FA devre dışı bırakma başarısız' });
  }
});

// ──────────────────────────────────────────────────────────────
// PROTECTED: POST /api/2fa/backup-codes
// Yeni backup kodlar üret (mevcut TOTP kodu ile)
// Body: { token: "123456" }
// ──────────────────────────────────────────────────────────────
router.post('/backup-codes', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Doğrulama kodu gerekli' });
    }

    const user = await AdminUser.findByPk(req.user.id);
    if (!user || !user.two_factor_enabled) {
      return res.status(400).json({ success: false, error: '2FA aktif değil' });
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'Optima HR',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.two_factor_secret)
    });

    const delta = totp.validate({ token: token.toString().replace(/\s/g, ''), window: 1 });
    if (delta === null) {
      return res.status(401).json({ success: false, error: 'Geçersiz doğrulama kodu' });
    }

    const newBackupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    const hashedBackupCodes = newBackupCodes.map(code => ({
      code: crypto.createHash('sha256').update(code).digest('hex'),
      used: false
    }));

    await user.update({ two_factor_backup_codes: JSON.stringify(hashedBackupCodes) });

    res.json({
      success: true,
      backupCodes: newBackupCodes,
      message: 'Yeni yedek kodlar oluşturuldu. Eski kodlar geçersiz sayıldı.'
    });
  } catch (error) {
    console.error('[2FA] Backup codes error:', error);
    res.status(500).json({ success: false, error: 'Yedek kodlar oluşturulamadı' });
  }
});

// ──────────────────────────────────────────────────────────────
// PROTECTED: GET /api/2fa/status
// Kullanıcının 2FA durumu
// ──────────────────────────────────────────────────────────────
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await AdminUser.findByPk(req.user.id, {
      attributes: ['id', 'two_factor_enabled', 'two_factor_backup_codes']
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }

    let remainingBackupCodes = 0;
    if (user.two_factor_enabled && user.two_factor_backup_codes) {
      try {
        const codes = JSON.parse(user.two_factor_backup_codes);
        remainingBackupCodes = codes.filter(c => !c.used).length;
      } catch { }
    }

    res.json({
      success: true,
      data: {
        enabled: user.two_factor_enabled,
        remainingBackupCodes
      }
    });
  } catch (error) {
    console.error('[2FA] Status error:', error);
    res.status(500).json({ success: false, error: '2FA durumu alınamadı' });
  }
});

module.exports = router;
