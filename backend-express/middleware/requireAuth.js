/**
 * requireAuth Middleware
 * 
 * JWT token doğrulama - korumalı route'lar için
 * Cookie veya Authorization header'dan token okur
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('⚠️  JWT_SECRET env var tanımlanmamış! Geçici rastgele key kullanılıyor.');
  return require('crypto').randomBytes(64).toString('hex');
})();

const COOKIE_NAME = 'optima_token';

const requireAuth = async (req, res, next) => {
  try {
    // Token'ı cookie'den veya Authorization header'dan al
    const token = req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.split(' ')[1]);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Yetkilendirme gerekli — token bulunamadı'
      });
    }

    // JWT doğrula
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Oturum süresi dolmuş' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Geçersiz token' });
    }
    return res.status(401).json({ success: false, error: 'Yetkilendirme hatası' });
  }
};

// Role-based access control
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Yetkilendirme gerekli' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz yok' });
    }
    next();
  };
};

module.exports = { requireAuth, requireRole };
