/**
 * requireAuth Middleware
 * 
 * JWT token doğrulama - korumalı route'lar için
 * Cookie veya Authorization header'dan token okur
 * 
 * GÜVENLİK: 
 * - Tüm auth hataları 404 döner — endpoint varlığını gizler
 * - IP binding: Token'daki IP ile mevcut IP karşılaştırılır
 * - Sliding session: Token ömrünün %75'i geçmişse otomatik yenile
 */

const jwt = require('jsonwebtoken');
const getClientIP = require('../utils/getClientIP');

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('⚠️  JWT_SECRET env var tanımlanmamış! Geçici rastgele key kullanılıyor.');
  return require('crypto').randomBytes(64).toString('hex');
})();

const COOKIE_NAME = 'optima_token';
const SESSION_DURATION = '30m';
const SESSION_DURATION_MS = 30 * 60 * 1000;

const requireAuth = async (req, res, next) => {
  try {
    // Token'ı cookie'den veya Authorization header'dan al
    const token = req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.split(' ')[1]);

    if (!token) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    // JWT doğrula
    const decoded = jwt.verify(token, JWT_SECRET);

    // IP Binding kontrolü (Plan 04)
    if (decoded.ip) {
      const currentIP = getClientIP(req);
      if (currentIP && decoded.ip !== currentIP) {
        console.warn(`⚠️ IP mismatch: token=${decoded.ip}, current=${currentIP}, user=${decoded.email}`);
        return res.status(404).json({ error: 'Endpoint not found' });
      }
    }

    req.user = decoded;

    // Sliding session: Token ömrünün %75'i geçmişse otomatik yenile
    if (decoded.iat && decoded.exp) {
      const tokenAge = (Date.now() / 1000) - decoded.iat;
      const maxAge = decoded.exp - decoded.iat;
      if (tokenAge > maxAge * 0.75) {
        const newToken = jwt.sign(
          { id: decoded.id, email: decoded.email, role: decoded.role, ip: decoded.ip, tv: decoded.tv },
          JWT_SECRET,
          { expiresIn: SESSION_DURATION }
        );
        const getCookieOptions = () => ({
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          domain: process.env.NODE_ENV === 'production' ? '.optima-hr.net' : undefined,
          maxAge: SESSION_DURATION_MS,
          path: '/'
        });
        res.cookie(COOKIE_NAME, newToken, getCookieOptions());
      }
    }

    next();
  } catch (error) {
    // GÜVENLİK: Tüm auth hataları aynı 404 response — saldırgan ayrıştıramaz
    return res.status(404).json({ error: 'Endpoint not found' });
  }
};

// Role-based access control
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    next();
  };
};

module.exports = { requireAuth, requireRole };


