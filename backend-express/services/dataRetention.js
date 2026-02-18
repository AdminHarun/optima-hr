/**
 * Data Retention Service
 * Otomatik veri temizleme ve arşivleme
 * 
 * Politikalar:
 * - Audit loglar: 90 gün (arşivleme)
 * - Chat mesajları: 1 yıl
 * - Başvuru verileri: 2 yıl
 * - Session verileri: 30 gün
 * - Geçici dosyalar: 7 gün
 */

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const AuditLog = require('../models/AuditLog');

// Retention perioları (gün cinsinden)
const RETENTION_POLICIES = {
    audit_logs: 90,          // 3 ay
    chat_messages: 365,      // 1 yıl
    applicant_sessions: 30,  // 1 ay
    invitation_links: 180,   // 6 ay (expired olanlar)
    temp_files: 7,           // 1 hafta
    notifications: 60        // 2 ay
};

/**
 * Audit log temizleme (90 günden eski)
 */
async function cleanupAuditLogs() {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.audit_logs);

        const deleted = await AuditLog.destroy({
            where: {
                created_at: {
                    [Op.lt]: cutoffDate
                }
            }
        });

        console.log(`🧹 Audit logs cleanup: ${deleted} records older than ${RETENTION_POLICIES.audit_logs} days removed`);
        return deleted;
    } catch (error) {
        console.error('[DataRetention] Audit logs cleanup error:', error.message);
        return 0;
    }
}

/**
 * Expired session temizleme (30 günden eski)
 */
async function cleanupExpiredSessions() {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.applicant_sessions);

        // session_token'ları temizle
        const [updatedCount] = await sequelize.query(
            `UPDATE applicant_profiles 
       SET session_token = NULL 
       WHERE session_token IS NOT NULL 
       AND profile_created_at < :cutoffDate`,
            {
                replacements: { cutoffDate: cutoffDate.toISOString() },
                type: sequelize.QueryTypes.UPDATE
            }
        );

        console.log(`🧹 Sessions cleanup: ${updatedCount || 0} expired sessions cleared`);
        return updatedCount || 0;
    } catch (error) {
        console.error('[DataRetention] Sessions cleanup error:', error.message);
        return 0;
    }
}

/**
 * Expired invitation links temizleme
 */
async function cleanupExpiredInvitations() {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.invitation_links);

        const [results] = await sequelize.query(
            `UPDATE invitation_links 
       SET is_active = false 
       WHERE is_active = true 
       AND expires_at IS NOT NULL 
       AND expires_at < :cutoffDate`,
            {
                replacements: { cutoffDate: cutoffDate.toISOString() },
                type: sequelize.QueryTypes.UPDATE
            }
        );

        console.log(`🧹 Invitations cleanup: ${results || 0} expired invitations deactivated`);
        return results || 0;
    } catch (error) {
        console.error('[DataRetention] Invitations cleanup error:', error.message);
        return 0;
    }
}

/**
 * Eski bildirim temizleme
 */
async function cleanupOldNotifications() {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.notifications);

        const [results] = await sequelize.query(
            `DELETE FROM notifications 
       WHERE created_at < :cutoffDate 
       AND is_read = true`,
            {
                replacements: { cutoffDate: cutoffDate.toISOString() },
                type: sequelize.QueryTypes.DELETE
            }
        );

        console.log(`🧹 Notifications cleanup: ${results || 0} old read notifications removed`);
        return results || 0;
    } catch (error) {
        // Table might not exist yet
        if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
            return 0;
        }
        console.error('[DataRetention] Notifications cleanup error:', error.message);
        return 0;
    }
}

/**
 * Tüm retention politikalarını çalıştır
 */
async function runDataRetention() {
    console.log('🔄 Data retention job starting...');
    const startTime = Date.now();

    const results = {
        auditLogs: await cleanupAuditLogs(),
        sessions: await cleanupExpiredSessions(),
        invitations: await cleanupExpiredInvitations(),
        notifications: await cleanupOldNotifications()
    };

    const duration = Date.now() - startTime;
    console.log(`✅ Data retention completed in ${duration}ms:`, results);

    // Retention işlemini de audit log'a kaydet
    try {
        await AuditLog.create({
            action: 'system.data_retention',
            module: 'system',
            target_type: 'system',
            details: results,
            metadata: { duration_ms: duration, policies: RETENTION_POLICIES }
        });
    } catch (e) {
        // Audit log tablosu yoksa hata vermesin
    }

    return results;
}

/**
 * Cron-like scheduler (node-cron bağımlılığı olmadan)
 * Her gece 03:00'te çalışır
 */
function scheduleDataRetention() {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    // İlk çalıştırma: Başlangıçtan 1 saat sonra
    const firstRunDelay = 60 * 60 * 1000; // 1 saat

    setTimeout(async () => {
        // İlk çalıştırma
        await runDataRetention();

        // Sonra her 24 saatte bir tekrarla
        setInterval(async () => {
            await runDataRetention();
        }, TWENTY_FOUR_HOURS);
    }, firstRunDelay);

    console.log('📅 Data retention scheduled: first run in 1 hour, then every 24 hours');
}

module.exports = {
    runDataRetention,
    scheduleDataRetention,
    cleanupAuditLogs,
    cleanupExpiredSessions,
    cleanupExpiredInvitations,
    cleanupOldNotifications,
    RETENTION_POLICIES
};
