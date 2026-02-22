/**
 * PresenceService
 * In-memory presence tracking for employees.
 * Used by employees.js routes and OfflineMessagingService.
 */

class PresenceService {
    constructor() {
        this.onlineUsers = new Map(); // Map<presenceKey, { lastSeen, device, status }>
        this.cleanupInterval = null;
        this.autoAwayInterval = null;
        this.AUTO_AWAY_MINUTES = 10;

        // Cleanup stale entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this._cleanupStale();
        }, 5 * 60 * 1000);

        // Auto-away check every minute
        this.autoAwayInterval = setInterval(() => {
            this._checkAutoAway();
        }, 60 * 1000);

        console.log('🟢 PresenceService initialized');
    }

    /**
     * Check if user is online
     * @param {string} presenceKey - e.g. "employee_123"
     * @returns {boolean}
     */
    isOnline(presenceKey) {
        return this.onlineUsers.has(presenceKey);
    }

    /**
     * Set user as online
     * @param {string} presenceKey - e.g. "employee_123"
     * @param {string} device - 'web', 'mobile', 'desktop'
     */
    setOnline(presenceKey, device = 'web') {
        this.onlineUsers.set(presenceKey, {
            lastSeen: new Date(),
            lastActivity: new Date(),
            device,
            status: 'online',
            autoAway: false
        });
    }

    /**
     * Update activity timestamp (resets auto-away)
     * @param {string} presenceKey
     */
    updateActivity(presenceKey) {
        const entry = this.onlineUsers.get(presenceKey);
        if (entry) {
            entry.lastActivity = new Date();
            entry.lastSeen = new Date();
            if (entry.autoAway) {
                entry.status = 'online';
                entry.autoAway = false;
            }
        }
    }

    /**
     * Get user status
     * @param {string} presenceKey
     */
    getStatus(presenceKey) {
        const entry = this.onlineUsers.get(presenceKey);
        return entry ? entry.status : 'offline';
    }

    /**
     * Set user as offline
     * @param {string} presenceKey - e.g. "employee_123"
     */
    setOffline(presenceKey) {
        this.onlineUsers.delete(presenceKey);
    }

    /**
     * Get online user count
     */
    getOnlineCount() {
        return this.onlineUsers.size;
    }

    /**
     * Get all online user keys
     */
    getOnlineUsers() {
        return Array.from(this.onlineUsers.keys());
    }

    /**
     * Check for auto-away (10 min idle threshold)
     */
    _checkAutoAway() {
        const awayThreshold = Date.now() - this.AUTO_AWAY_MINUTES * 60 * 1000;
        for (const [key, data] of this.onlineUsers.entries()) {
            if (data.status === 'online' && !data.autoAway && data.lastActivity) {
                if (data.lastActivity.getTime() < awayThreshold) {
                    data.status = 'away';
                    data.autoAway = true;
                    this._persistAutoAway(key);
                }
            }
        }
    }

    /**
     * Persist auto-away to database
     */
    async _persistAutoAway(presenceKey) {
        try {
            const parts = presenceKey.split('_');
            if (parts[0] === 'employee' && parts[1]) {
                const EmployeePresence = require('../models/EmployeePresence');
                await EmployeePresence.update(
                    { status: 'away', auto_away: true },
                    { where: { employee_id: parseInt(parts[1]) } }
                );
            }
        } catch (error) {
            // Non-critical, ignore
        }
    }

    /**
     * Cleanup stale entries (5+ minutes without heartbeat)
     */
    _cleanupStale() {
        const staleThreshold = Date.now() - 5 * 60 * 1000;
        for (const [key, data] of this.onlineUsers.entries()) {
            if (data.lastSeen.getTime() < staleThreshold) {
                this.onlineUsers.delete(key);
            }
        }
    }

    /**
     * Shutdown
     */
    shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        if (this.autoAwayInterval) {
            clearInterval(this.autoAwayInterval);
            this.autoAwayInterval = null;
        }
        this.onlineUsers.clear();
        console.log('🟢 PresenceService shutdown');
    }
}

// Singleton
const presenceService = new PresenceService();
module.exports = presenceService;
