/**
 * Audit Logger Utility
 * 
 * Merkezi audit loglama — tüm kritik işlemleri kaydeder.
 * KVKK/GDPR uyumluluğu için hassas verileri otomatik maskeler.
 */

const AuditLog = require('../models/AuditLog');
const getClientIP = require('./getClientIP');

/**
 * Audit log kaydı oluştur
 * @param {Object} req - Express request objesi
 * @param {string} action - İşlem tipi (login.success, application.deleted, vb.)
 * @param {string} module - Modül adı (auth, applications, invitations, vb.)
 * @param {Object} details - Ek detaylar (JSON olarak saklanır)
 */
const auditLog = async (req, action, module, details = {}) => {
  try {
    // Hassas verileri details'den temizle
    const safeDetails = { ...details };
    delete safeDetails.password;
    delete safeDetails.token;
    delete safeDetails.secret;
    delete safeDetails.sessionToken;
    delete safeDetails.chatToken;

    await AuditLog.create({
      action,
      module,
      user_id: req.user?.id || null,
      user_email: req.user?.email || null,
      user_name: req.user
        ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email
        : (details.actorName || 'system'),
      ip_address: getClientIP(req) || 'unknown',
      user_agent: req.headers?.['user-agent'] || null,
      request_method: req.method,
      request_url: req.originalUrl,
      response_status: details.statusCode || 200,
      details: safeDetails
    });
  } catch (err) {
    // Audit log hatası ana işlemi engellememeli
    console.error('Audit log error:', err.message);
  }
};

module.exports = auditLog;
