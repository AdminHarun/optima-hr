/**
 * Audit Logger Middleware
 * Tüm kritik işlemleri loglar: kullanıcı, IP, request/response detayları, süre
 * 
 * Kullanım:
 *   router.post('/endpoint', authenticateToken, auditLogger('user.create', 'user'), handler)
 *   router.delete('/endpoint/:id', authenticateToken, auditLogger('user.delete', 'user'), handler)
 */

const AuditLog = require('../models/AuditLog');

// Hassas alanları filtrele
const SENSITIVE_FIELDS = ['password', 'password_hash', 'passwordHash', 'secret', 'token',
    'two_factor_secret', 'backup_codes', 'credit_card', 'iban', 'ssn', 'tc_no'];

function sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    for (const field of SENSITIVE_FIELDS) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }
    return sanitized;
}

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.ip ||
        'unknown';
}

/**
 * Audit logger middleware factory
 * @param {string} action - İşlem adı (ör: 'user.create', 'task.update', 'login.success')
 * @param {string} resourceType - Kaynak türü (ör: 'user', 'task', 'file', 'channel')
 */
const auditLogger = (action, resourceType) => {
    return async (req, res, next) => {
        const startTime = Date.now();

        // Response'u intercept et
        const originalSend = res.send;
        const originalJson = res.json;

        const logEntry = {
            action,
            module: resourceType,
            target_type: resourceType,
            target_id: req.params.id ? parseInt(req.params.id) : null,
            user_id: req.user?.id || null,
            user_email: req.user?.email || null,
            user_name: req.user?.name || null,
            ip_address: getClientIp(req),
            metadata: {
                method: req.method,
                url: req.originalUrl,
                body: sanitizeBody(req.body),
                query: req.query,
                userAgent: req.get('user-agent'),
                params: req.params
            }
        };

        // Site bilgisi
        if (req.user?.siteCode) {
            try {
                // site_id sayısal olmalı, yoksa null
                logEntry.site_id = null;
            } catch (e) { /* ignore */ }
        }

        // Response'u interkapte et ve log'a ekle
        res.send = function (data) {
            const duration = Date.now() - startTime;

            // Asenkron log - response'u bekletme
            createAuditLogAsync({
                ...logEntry,
                details: {
                    ...logEntry.metadata,
                    responseStatus: res.statusCode,
                    duration_ms: duration
                }
            });

            return originalSend.call(this, data);
        };

        res.json = function (data) {
            const duration = Date.now() - startTime;

            // Kaynak adını response'dan almaya çalış
            if (data && !logEntry.target_name) {
                logEntry.target_name = data.name || data.title || data.display_name ||
                    data.email || data.first_name || null;
            }

            // Asenkron log
            createAuditLogAsync({
                ...logEntry,
                details: {
                    ...logEntry.metadata,
                    responseStatus: res.statusCode,
                    duration_ms: duration
                }
            });

            return originalJson.call(this, data);
        };

        next();
    };
};

/**
 * Asenkron audit log oluşturma (response'u bloklamaz)
 */
async function createAuditLogAsync(logData) {
    try {
        await AuditLog.create(logData);
    } catch (error) {
        // Audit log hatası uygulamayı durdurmamalı
        console.error('[AuditLogger] Create error:', error.message);
    }
}

/**
 * Manuel audit log oluşturma (middleware dışı kullanım)
 * @param {object} data - { action, module, target_type, target_id, details, user_id, user_email, ip_address }
 * @param {object} req - Express request object (opsiyonel)
 */
async function logAuditEvent(data, req = null) {
    try {
        const logEntry = {
            action: data.action,
            module: data.module || data.target_type,
            target_type: data.target_type,
            target_id: data.target_id || null,
            target_name: data.target_name || null,
            details: data.details || {},
            old_values: data.old_values || null,
            new_values: data.new_values || null,
            user_id: data.user_id || req?.user?.id || null,
            user_email: data.user_email || req?.user?.email || null,
            user_name: data.user_name || req?.user?.name || null,
            ip_address: data.ip_address || (req ? getClientIp(req) : null),
            metadata: data.metadata || {}
        };

        await AuditLog.create(logEntry);
    } catch (error) {
        console.error('[AuditLogger] logAuditEvent error:', error.message);
    }
}

module.exports = {
    auditLogger,
    logAuditEvent,
    createAuditLogAsync
};
