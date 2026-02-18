/**
 * PresenceService
 * In-memory presence tracking for employees.
 * Used by employees.js routes and OfflineMessagingService.
 */

class PresenceService {
    constructor() {
        this.onlineUsers = new Map(); // Map<presenceKey, { lastSeen, device }>
        this.cleanupInterval = null;

        // Cleanup stale entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this._cleanupStale();
        }, 5 * 60 * 1000);

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
            device
        });
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
        this.onlineUsers.clear();
        console.log('🟢 PresenceService shutdown');
    }
}

// Singleton
const presenceService = new PresenceService();
module.exports = presenceService;
