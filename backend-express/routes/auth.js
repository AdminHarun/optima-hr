/**
 * Auth Routes - JWT + httpOnly Cookie Authentication
 * Part 1: Güvenlik Temeli
 * 
 * POST /api/auth/login   → JWT üretir, httpOnly cookie gönderir
 * POST /api/auth/logout  → Cookie temizler
 * GET  /api/auth/me      → Mevcut oturum bilgisi
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const Employee = require('../models/Employee');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('⚠️  JWT_SECRET env var tanımlanmamış! Geçici rastgele key kullanılıyor.');
  return require('crypto').randomBytes(64).toString('hex');
})();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m';
const COOKIE_NAME = 'optima_token';

// Cookie ayarları
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.optima-hr.net' : undefined,
  maxAge: 30 * 60 * 1000, // 30 dakika
  path: '/'
});

// Turnstile bot koruması
const { verifyTurnstile } = require('../middleware/turnstile');

// IP Brute Force koruması
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 dakika

const checkBruteForce = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && record.count >= MAX_ATTEMPTS && (now - record.lastAttempt) < LOCKOUT_MS) {
    const remainMin = Math.ceil((LOCKOUT_MS - (now - record.lastAttempt)) / 60000);
    return res.status(429).json({
      success: false,
      error: `Çok fazla başarısız deneme. ${remainMin} dakika sonra tekrar deneyin.`
    });
  }

  // Eski kayıtları temizle
  if (record && (now - record.lastAttempt) >= LOCKOUT_MS) {
    loginAttempts.delete(ip);
  }

  next();
};

const recordFailedAttempt = (ip) => {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lastAttempt: now };
  record.count++;
  record.lastAttempt = now;
  loginAttempts.set(ip, record);
};

const clearFailedAttempts = (ip) => {
  loginAttempts.delete(ip);
};

/**
 * POST /api/auth/login
 * Email + şifre ile giriş yapar, JWT cookie döner
 */
router.post('/login', checkBruteForce, verifyTurnstile, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email ve şifre gereklidir'
      });
    }

    // Kullanıcıyı veritabanında bul
    const user = await AdminUser.findOne({
      where: { email: email.toLowerCase() },
      include: [{
        model: Employee,
        as: 'employee',
        required: false
      }]
    });

    if (!user) {
      recordFailedAttempt(req.ip || req.headers['x-forwarded-for'] || 'unknown');
      return res.status(401).json({
        success: false,
        error: 'Geçersiz email veya şifre'
      });
    }

    // Hesap aktif mi kontrol et
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Hesabınız deaktif durumda. Yöneticinizle iletişime geçin.'
      });
    }

    // Şifre doğrula (bcrypt)
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      recordFailedAttempt(req.ip || req.headers['x-forwarded-for'] || 'unknown');
      return res.status(401).json({
        success: false,
        error: 'Geçersiz email veya şifre'
      });
    }

    // JWT token oluştur — IP binding için IP'yi payload'a göm
    const getClientIP = require('../utils/getClientIP');
    const clientIP = getClientIP(req);
    
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      type: user.role === 'USER' ? 'employee' : 'admin',
      site_code: user.site_code,
      employee_id: user.employee_id || null,
      ip: clientIP,  // GÜVENLİK: IP binding (Plan 04)
      tv: (user.token_version || 0) + 1  // Token version — single-session enforcement
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    // Son giriş zamanını güncelle + token_version artır (eski oturumlar geçersiz olur)
    const newVersion = (user.token_version || 0) + 1;
    await user.update({ last_login: new Date(), token_version: newVersion });

    // Brute force sayacını sıfırla
    clearFailedAttempts(req.ip || req.headers['x-forwarded-for'] || 'unknown');

    // Audit log — başarılı giriş kaydı
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'login',
        module: 'auth',
        user_id: user.id,
        user_email: user.email,
        user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        ip_address: req.ip || req.headers['x-forwarded-for'] || 'unknown',
        user_agent: req.headers['user-agent'],
        request_method: 'POST',
        request_url: '/api/auth/login',
        response_status: 200,
        details: { origin: req.headers.origin || 'unknown' }
      });
    } catch (e) { /* audit log hatası login'i engellemesin */ }

    // 2FA kontrolü — aktifse cookie verme, frontend /api/2fa/verify çağırsın
    if (user.two_factor_enabled) {
      // Brute force sayacını sıfırla
      clearFailedAttempts(req.ip || req.headers['x-forwarded-for'] || 'unknown');
      
      return res.json({
        success: true,
        requires2FA: true,
        userId: user.id,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          two_factor_enabled: true
        }
      });
    }

    // httpOnly cookie olarak gönder
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    // Kullanıcı bilgilerini döndür (şifre hariç)
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
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Giriş sırasında bir hata oluştu'
    });
  }
});

/**
 * POST /api/auth/logout
 * Cookie'yi temizler — tüm domain/path kombinasyonları
 */
router.post('/logout', (req, res) => {
  // GÜVENLİK: clearCookie parametreleri setCookie ile AYNI OLMALI
  // Aksi halde tarayıcı cookie'yi silmez!
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.optima-hr.net' : undefined,
    path: '/'
  };

  res.clearCookie(COOKIE_NAME, clearOptions);

  // Ek güvenlik: domain'siz de temizle (subdomain farkları için)
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  });

  // Cache-Control: Tarayıcı auth state'i cache'lemesin
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.json({
    success: true,
    message: 'Başarıyla çıkış yapıldı'
  });
});

/**
 * GET /api/auth/me
 * Cookie'deki JWT ile kullanıcı bilgisi döner
 */
router.get('/me', async (req, res) => {
  try {
    // Token'ı cookie'den veya Authorization header'dan al
    const token = req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.split(' ')[1]);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Oturum bulunamadı'
      });
    }

    // JWT doğrula
    const decoded = jwt.verify(token, JWT_SECRET);

    // Kullanıcıyı veritabanından çek (güncel bilgi için)
    const user = await AdminUser.findByPk(decoded.id, {
      include: [{
        model: Employee,
        as: 'employee',
        required: false
      }]
    });

    if (!user || !user.is_active) {
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({
        success: false,
        error: 'Oturum geçersiz'
      });
    }

    // Token version kontrolü — yeni login yapıldıysa eski oturumlar geçersiz olur
    if (decoded.tv !== undefined && user.token_version !== decoded.tv) {
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.optima-hr.net' : undefined,
        path: '/'
      });
      return res.status(401).json({
        success: false,
        error: 'Oturum geçersiz'
      });
    }

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
    if (error.name === 'TokenExpiredError') {
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({
        success: false,
        error: 'Oturum süresi doldu, lütfen tekrar giriş yapın'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({
        success: false,
        error: 'Geçersiz oturum'
      });
    }

    console.error('[Auth] Me error:', error);
    res.status(500).json({
      success: false,
      error: 'Oturum kontrolü sırasında hata oluştu'
    });
  }
});

module.exports = router;
