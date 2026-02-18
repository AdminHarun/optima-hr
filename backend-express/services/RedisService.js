/**
 * RedisService
 * Redis integration for presence tracking, pub/sub, and caching.
 * Falls back to in-memory when Redis is unavailable.
 *
 * Used by: ChatWebSocketService, employees-chat.js, OfflineMessagingService
 */

class RedisService {
    constructor() {
        this.client = null;
        this.subscriber = null;
        this.isConnected = false;
        this.subscriptions = new Map(); // channel -> callback
        this.onlineUsers = new Map(); // In-memory fallback
        this.typingState = new Map(); // In-memory fallback
        console.log('🔴 RedisService initialized (in-memory fallback mode)');
    }

    /**
     * Connect to Redis
     */
    async connect() {
        try {
            const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
            if (!redisUrl) {
                console.warn('[Redis] No REDIS_URL configured, using in-memory fallback');
                return;
            }

            const { createClient } = require('redis');
            this.client = createClient({ url: redisUrl });
            this.subscriber = this.client.duplicate();

            this.client.on('error', (err) => {
                console.error('[Redis] Client error:', err.message);
                this.isConnected = false;
            });

            await this.client.connect();
            await this.subscriber.connect();
            this.isConnected = true;
            console.log('✅ Redis connected');
        } catch (error) {
            console.warn('[Redis] Connection failed, using in-memory fallback:', error.message);
            this.isConnected = false;
        }
    }

    /**
     * Subscribe to a channel
     */
    async subscribe(channel, callback) {
        this.subscriptions.set(channel, callback);

        if (this.isConnected && this.subscriber) {
            try {
                await this.subscriber.subscribe(channel, (message) => {
                    try {
                        const data = JSON.parse(message);
                        callback(data);
                    } catch (e) {
                        callback(message);
                    }
                });
            } catch (error) {
                console.error('[Redis] Subscribe error:', error.message);
            }
        }
    }

    /**
     * Publish to a channel
     */
    async publish(channel, data) {
        if (this.isConnected && this.client) {
            try {
                await this.client.publish(channel, JSON.stringify(data));
            } catch (error) {
                console.error('[Redis] Publish error:', error.message);
            }
        }
    }

    // ==================== PRESENCE ====================

    /**
     * Set user as online
     */
    async setUserOnline(userType, userId, device = 'web') {
        const key = `${userType}:${userId}`;

        if (this.isConnected && this.client) {
            try {
                await this.client.hSet(`presence:${key}`, {
                    status: 'online',
                    device,
                    lastSeen: new Date().toISOString()
                });
                await this.client.expire(`presence:${key}`, 3600); // 1 hour TTL
            } catch (error) {
                console.error('[Redis] setUserOnline error:', error.message);
            }
        }

        // Also keep in-memory
        this.onlineUsers.set(key, { status: 'online', device, lastSeen: new Date() });
    }

    /**
     * Set user as offline
     */
    async setUserOffline(userType, userId) {
        const key = `${userType}:${userId}`;

        if (this.isConnected && this.client) {
            try {
                await this.client.del(`presence:${key}`);
            } catch (error) {
                console.error('[Redis] setUserOffline error:', error.message);
            }
        }

        this.onlineUsers.delete(key);
    }

    /**
     * Check if user is online
     */
    async isUserOnline(userType, userId) {
        const key = `${userType}:${userId}`;

        if (this.isConnected && this.client) {
            try {
                const exists = await this.client.exists(`presence:${key}`);
                return exists > 0;
            } catch (error) {
                // fallback
            }
        }

        return this.onlineUsers.has(key);
    }

    /**
     * Get user presence details
     */
    async getUserPresence(userType, userId) {
        const key = `${userType}:${userId}`;

        if (this.isConnected && this.client) {
            try {
                const data = await this.client.hGetAll(`presence:${key}`);
                if (data && data.status) {
                    return {
                        status: data.status,
                        device: data.device || 'web',
                        lastSeen: data.lastSeen
                    };
                }
            } catch (error) {
                // fallback
            }
        }

        const memData = this.onlineUsers.get(key);
        if (memData) {
            return {
                status: memData.status,
                device: memData.device || 'web',
                lastSeen: memData.lastSeen?.toISOString()
            };
        }

        return { status: 'offline' };
    }

    /**
     * Get online user IDs for a user type
     */
    async getOnlineUsers(userType) {
        const onlineIds = [];

        // From in-memory
        for (const [key, data] of this.onlineUsers.entries()) {
            if (key.startsWith(`${userType}:`)) {
                const id = parseInt(key.split(':')[1]);
                if (!isNaN(id)) onlineIds.push(id);
            }
        }

        return onlineIds;
    }

    /**
     * Bulk get presence for multiple users
     */
    async bulkGetPresence(userType, userIds) {
        const presenceMap = {};

        for (const userId of userIds) {
            presenceMap[userId] = await this.getUserPresence(userType, userId);
        }

        return presenceMap;
    }

    /**
     * Publish presence change event
     */
    async publishPresenceChange(userType, userId, status) {
        await this.publish('presence:changes', {
            userType,
            userId,
            status,
            timestamp: new Date().toISOString()
        });
    }

    // ==================== TYPING ====================

    /**
     * Set typing state
     */
    async setTyping(roomId, userType, userId, isTyping = true) {
        const key = `typing:${roomId}:${userType}:${userId}`;

        if (isTyping) {
            this.typingState.set(key, Date.now());
        } else {
            this.typingState.delete(key);
        }
    }

    /**
     * Clear typing state for a room
     */
    async clearTyping(roomId, userType, userId) {
        const key = `typing:${roomId}:${userType}:${userId}`;
        this.typingState.delete(key);
    }

    // ==================== GENERAL KEY-VALUE ====================

    async get(key) {
        if (this.isConnected && this.client) {
            try {
                return await this.client.get(key);
            } catch (error) {
                return null;
            }
        }
        return null;
    }

    async set(key, value, ttlSeconds) {
        if (this.isConnected && this.client) {
            try {
                if (ttlSeconds) {
                    await this.client.set(key, value, { EX: ttlSeconds });
                } else {
                    await this.client.set(key, value);
                }
            } catch (error) {
                console.error('[Redis] Set error:', error.message);
            }
        }
    }

    async del(key) {
        if (this.isConnected && this.client) {
            try {
                await this.client.del(key);
            } catch (error) {
                console.error('[Redis] Del error:', error.message);
            }
        }
    }

    /**
     * Disconnect
     */
    async disconnect() {
        if (this.client) {
            try {
                await this.client.disconnect();
            } catch (e) { }
        }
        if (this.subscriber) {
            try {
                await this.subscriber.disconnect();
            } catch (e) { }
        }
        this.isConnected = false;
        this.onlineUsers.clear();
        console.log('🔴 Redis disconnected');
    }
}

// Singleton
const redisService = new RedisService();
module.exports = redisService;
