/**
 * PresenceService - Online/Offline Tracking for Users
 *
 * Manages user presence status across the application.
 * Tracks online/offline states, last seen timestamps, and broadcasts updates.
 */

class PresenceService {
  constructor() {
    // Map<userId, { status, lastSeen, socketCount, userType }>
    this.userStatus = new Map();

    // Map<userId, Set<subscriberId>> - who is watching this user's status
    this.presenceSubscriptions = new Map();

    // Callback for broadcasting (set by ChatWebSocketService)
    this.broadcastCallback = null;

    console.log('Presence Service initialized');
  }

  /**
   * Set broadcast callback (called from ChatWebSocketService)
   */
  setBroadcastCallback(callback) {
    this.broadcastCallback = callback;
  }

  /**
   * Mark user as online (called when WebSocket connects)
   */
  setOnline(userId, userType = 'employee') {
    const current = this.userStatus.get(userId) || { socketCount: 0 };

    this.userStatus.set(userId, {
      status: 'online',
      lastSeen: new Date(),
      socketCount: current.socketCount + 1,
      userType
    });

    // Broadcast presence change
    this.broadcastPresence(userId, 'online');

    console.log(`User ${userId} is now online (connections: ${current.socketCount + 1})`);

    return this.userStatus.get(userId);
  }

  /**
   * Mark user as offline (called when WebSocket disconnects)
   */
  setOffline(userId) {
    const current = this.userStatus.get(userId);

    if (!current) {
      return null;
    }

    // Decrease socket count
    const newCount = Math.max(0, current.socketCount - 1);

    if (newCount > 0) {
      // Still has active connections
      this.userStatus.set(userId, {
        ...current,
        socketCount: newCount,
        lastSeen: new Date()
      });
      console.log(`User ${userId} still online (connections: ${newCount})`);
      return this.userStatus.get(userId);
    }

    // No more connections - mark as offline
    this.userStatus.set(userId, {
      status: 'offline',
      lastSeen: new Date(),
      socketCount: 0,
      userType: current.userType
    });

    // Broadcast presence change
    this.broadcastPresence(userId, 'offline');

    console.log(`User ${userId} is now offline`);

    return this.userStatus.get(userId);
  }

  /**
   * Update user's last activity timestamp
   */
  updateActivity(userId) {
    const current = this.userStatus.get(userId);
    if (current) {
      current.lastSeen = new Date();
      this.userStatus.set(userId, current);
    }
  }

  /**
   * Get user's current status
   */
  getStatus(userId) {
    const status = this.userStatus.get(userId);
    return status?.status || 'offline';
  }

  /**
   * Get user's full presence info
   */
  getPresenceInfo(userId) {
    return this.userStatus.get(userId) || {
      status: 'offline',
      lastSeen: null,
      socketCount: 0,
      userType: 'unknown'
    };
  }

  /**
   * Check if user is online
   */
  isOnline(userId) {
    return this.getStatus(userId) === 'online';
  }

  /**
   * Get all online users
   */
  getOnlineUsers() {
    const onlineUsers = [];

    for (const [userId, info] of this.userStatus.entries()) {
      if (info.status === 'online') {
        onlineUsers.push({
          userId,
          ...info
        });
      }
    }

    return onlineUsers;
  }

  /**
   * Get all online users of a specific type
   */
  getOnlineUsersByType(userType) {
    return this.getOnlineUsers().filter(u => u.userType === userType);
  }

  /**
   * Get presence status for multiple users
   */
  getBulkStatus(userIds) {
    const result = {};

    for (const userId of userIds) {
      result[userId] = this.getPresenceInfo(userId);
    }

    return result;
  }

  /**
   * Subscribe to a user's presence updates
   */
  subscribeToUser(targetUserId, subscriberId) {
    if (!this.presenceSubscriptions.has(targetUserId)) {
      this.presenceSubscriptions.set(targetUserId, new Set());
    }

    this.presenceSubscriptions.get(targetUserId).add(subscriberId);
    console.log(`User ${subscriberId} subscribed to presence of ${targetUserId}`);
  }

  /**
   * Unsubscribe from a user's presence updates
   */
  unsubscribeFromUser(targetUserId, subscriberId) {
    const subscribers = this.presenceSubscriptions.get(targetUserId);
    if (subscribers) {
      subscribers.delete(subscriberId);
      if (subscribers.size === 0) {
        this.presenceSubscriptions.delete(targetUserId);
      }
    }
  }

  /**
   * Unsubscribe from all presence subscriptions (when user disconnects)
   */
  unsubscribeAll(subscriberId) {
    for (const [, subscribers] of this.presenceSubscriptions.entries()) {
      subscribers.delete(subscriberId);
    }
  }

  /**
   * Get subscribers interested in a user's presence
   */
  getSubscribers(userId) {
    return this.presenceSubscriptions.get(userId) || new Set();
  }

  /**
   * Broadcast presence change to interested parties
   */
  broadcastPresence(userId, status) {
    if (!this.broadcastCallback) {
      return;
    }

    const presenceInfo = this.getPresenceInfo(userId);
    const message = {
      type: 'presence_change',
      userId,
      status,
      lastSeen: presenceInfo.lastSeen?.toISOString(),
      userType: presenceInfo.userType,
      timestamp: new Date().toISOString()
    };

    // Broadcast to subscribers
    const subscribers = this.getSubscribers(userId);
    for (const subscriberId of subscribers) {
      this.broadcastCallback(subscriberId, message);
    }

    // Also broadcast globally (for admin dashboards, etc.)
    this.broadcastCallback('__global__', message);
  }

  /**
   * Get statistics
   */
  getStats() {
    let onlineCount = 0;
    let offlineCount = 0;
    const byType = {};

    for (const [, info] of this.userStatus.entries()) {
      if (info.status === 'online') {
        onlineCount++;
        byType[info.userType] = (byType[info.userType] || 0) + 1;
      } else {
        offlineCount++;
      }
    }

    return {
      totalTracked: this.userStatus.size,
      online: onlineCount,
      offline: offlineCount,
      byUserType: byType,
      subscriptionCount: this.presenceSubscriptions.size
    };
  }

  /**
   * Clean up stale entries (optional, run periodically)
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - maxAge);
    let cleaned = 0;

    for (const [userId, info] of this.userStatus.entries()) {
      if (info.status === 'offline' && info.lastSeen < cutoff) {
        this.userStatus.delete(userId);
        this.presenceSubscriptions.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} stale presence entries`);
    }

    return cleaned;
  }
}

// Create singleton instance
const presenceService = new PresenceService();

module.exports = presenceService;
