/**
 * chatAuth Middleware - Chat sistemi icin yetkilendirme
 *
 * JWT token dogrulama (WebSocket ve REST)
 * Room membership kontrolu
 * Channel type erisim kontrolu
 * Rate limiting
 */

const jwt = require('jsonwebtoken');
const ChatRoom = require('../models/ChatRoom');
const ChatRoomMember = require('../models/ChatRoomMember');
const AdminUser = require('../models/AdminUser');
const Employee = require('../models/Employee');
const redisService = require('../services/RedisService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * JWT Token dogrulama (REST API icin)
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Yetkilendirme token\'i gerekli'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Kullanici tipine gore bilgileri getir
    if (decoded.type === 'admin' || decoded.type === 'employee') {
      const user = await AdminUser.findByPk(decoded.id, {
        include: decoded.employee_id ? [{
          model: Employee,
          as: 'employee'
        }] : []
      });

      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          error: 'Kullanici bulunamadi veya aktif degil'
        });
      }

      req.user = {
        id: user.id,
        type: decoded.type,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        siteCode: user.site_code,
        employeeId: user.employee_id,
        employee: user.employee
      };
    } else if (decoded.type === 'applicant') {
      // Aday dogrulamasi
      req.user = {
        id: decoded.id,
        type: 'applicant',
        email: decoded.email,
        name: decoded.name,
        applicantId: decoded.applicant_id
      };
    } else {
      return res.status(401).json({
        success: false,
        error: 'Gecersiz kullanici tipi'
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token suresi dolmus'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Gecersiz token'
      });
    }
    console.error('[chatAuth] Token dogrulama hatasi:', error);
    return res.status(500).json({
      success: false,
      error: 'Yetkilendirme hatasi'
    });
  }
};

/**
 * WebSocket baglantisi icin token dogrulama
 */
const authenticateWebSocket = async (token) => {
  try {
    if (!token) {
      return { success: false, error: 'Token gerekli' };
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type === 'admin' || decoded.type === 'employee') {
      const user = await AdminUser.findByPk(decoded.id, {
        include: decoded.employee_id ? [{
          model: Employee,
          as: 'employee'
        }] : []
      });

      if (!user || !user.is_active) {
        return { success: false, error: 'Kullanici aktif degil' };
      }

      return {
        success: true,
        user: {
          id: user.id,
          type: decoded.type,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role,
          siteCode: user.site_code,
          employeeId: user.employee_id
        }
      };
    } else if (decoded.type === 'applicant') {
      return {
        success: true,
        user: {
          id: decoded.id,
          type: 'applicant',
          email: decoded.email,
          name: decoded.name,
          applicantId: decoded.applicant_id
        }
      };
    }

    return { success: false, error: 'Gecersiz kullanici tipi' };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { success: false, error: 'Token suresi dolmus' };
    }
    return { success: false, error: 'Gecersiz token' };
  }
};

/**
 * Oda erisim kontrolu middleware'i
 */
const validateRoomAccess = async (req, res, next) => {
  try {
    const roomId = req.params.roomId || req.body.roomId;
    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Oda ID\'si gerekli'
      });
    }

    const { user } = req;
    const result = await ChatRoom.validateAccess(user.id, user.type, roomId);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        error: result.reason
      });
    }

    // Oda bilgisini request'e ekle
    req.room = await ChatRoom.findByPk(roomId);
    next();
  } catch (error) {
    console.error('[chatAuth] Oda erisim kontrolu hatasi:', error);
    return res.status(500).json({
      success: false,
      error: 'Erisim kontrolu sirasinda hata olustu'
    });
  }
};

/**
 * Kanal tipi kontrolu (INTERNAL/EXTERNAL)
 */
const validateChannelAccess = (allowedChannels) => {
  return async (req, res, next) => {
    try {
      const { user } = req;

      // Aday sadece EXTERNAL kanallara erisebilir
      if (user.type === 'applicant' && !allowedChannels.includes('EXTERNAL')) {
        return res.status(403).json({
          success: false,
          error: 'Bu kanala erisim izniniz yok'
        });
      }

      // Admin ve employee tum kanallara erisebilir
      next();
    } catch (error) {
      console.error('[chatAuth] Kanal erisim kontrolu hatasi:', error);
      return res.status(500).json({
        success: false,
        error: 'Kanal erisim kontrolu hatasi'
      });
    }
  };
};

/**
 * Sadece calisanlar icin erisim
 */
const employeeOnly = (req, res, next) => {
  if (req.user.type !== 'employee' && req.user.type !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Bu islem sadece calisanlar icin gecerlidir'
    });
  }
  next();
};

/**
 * Sadece adminler icin erisim
 */
const adminOnly = (req, res, next) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Bu islem sadece adminler icin gecerlidir'
    });
  }
  next();
};

/**
 * Super Admin veya belirli roller icin erisim
 */
const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Bu islem icin yetkiniz yok'
      });
    }
    next();
  };
};

/**
 * Rate limiting middleware
 */
const rateLimitChat = async (req, res, next) => {
  try {
    const { user } = req;
    const result = await redisService.checkMessageRateLimit(user.id, user.type);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Cok fazla istek gonderdiniz. Lutfen bekleyin.',
        retryAfter: 60
      });
    }

    next();
  } catch (error) {
    // Redis hatasi durumunda isleme devam et
    console.warn('[chatAuth] Rate limit kontrolu hatasi:', error.message);
    next();
  }
};

/**
 * Duyuru kanali yazma yetkisi kontrolu
 */
const canWriteAnnouncement = async (req, res, next) => {
  try {
    const { room, user } = req;

    // Duyuru kanali degilse devam et
    if (!room.announcement_only) {
      return next();
    }

    // Sadece owner ve admin yazabilir
    const member = await ChatRoomMember.findOne({
      where: {
        room_id: room.id,
        member_type: user.type,
        member_id: user.id,
        role: ['owner', 'admin']
      }
    });

    if (!member) {
      return res.status(403).json({
        success: false,
        error: 'Bu duyuru kanalina sadece yetkililer yazabilir'
      });
    }

    next();
  } catch (error) {
    console.error('[chatAuth] Duyuru yetkisi kontrolu hatasi:', error);
    return res.status(500).json({
      success: false,
      error: 'Yetki kontrolu hatasi'
    });
  }
};

/**
 * Site izolasyonu kontrolu
 */
const validateSiteAccess = async (req, res, next) => {
  try {
    const { user, room } = req;

    // Super Admin tum sitelere erisebilir
    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Oda baska bir site'a aitse engelle
    if (room.site_code && user.siteCode && room.site_code !== user.siteCode) {
      return res.status(403).json({
        success: false,
        error: 'Bu odaya erisim izniniz yok'
      });
    }

    next();
  } catch (error) {
    console.error('[chatAuth] Site erisim kontrolu hatasi:', error);
    return res.status(500).json({
      success: false,
      error: 'Site erisim kontrolu hatasi'
    });
  }
};

module.exports = {
  authenticateToken,
  authenticateWebSocket,
  validateRoomAccess,
  validateChannelAccess,
  employeeOnly,
  adminOnly,
  requireRoles,
  rateLimitChat,
  canWriteAnnouncement,
  validateSiteAccess
};
