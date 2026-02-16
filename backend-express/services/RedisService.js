/**
 * RedisService - Redis Pub/Sub, Caching ve Presence Yonetimi
 *
 * Ozellikler:
 * - Pub/Sub: WebSocket mesaj dagitimi (multi-instance destegi)
 * - Presence: Online kullanici durumu (TTL ile otomatik expire)
 * - Caching: Sik kullanilan veriler
 * - Rate Limiting: WebSocket flood korumasi
 */

let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  console.warn('[RedisService] ioredis not installed, using mock mode');
  Redis = null;
}

class RedisService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
    this.useMock = !Redis || !process.env.REDIS_URL;
    this.mockStore = new Map();
    this.mockSubscribers = new Map();

    if (!this.useMock) {
      this._connect();
    } else {
      console.log('[RedisService] Running in mock mode (no Redis)');
      this.isConnected = true;
    }
  }

  // Public connect method
  async connect() {
    if (this.useMock) {
      return true;
    }
    return this._connect();
  }

  _connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.subscriber = new Redis(redisUrl);
      this.publisher = new Redis(redisUrl);

      this.client.on('connect', () => {
        console.log('[RedisService] Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('[RedisService] Redis error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('[RedisService] Redis connection closed');
        this.isConnected = false;
      });

      this.client.connect().catch(err => {
        console.warn('[RedisService] Could not connect to Redis, using mock mode:', err.message);
        this.useMock = true;
        this.isConnected = true;
      });

    } catch (error) {
      console.warn('[RedisService] Redis initialization failed, using mock mode:', error.message);
      this.useMock = true;
      this.isConnected = true;
    }
  }

  // ==================== PRESENCE ====================

  async setUserOnline(userType, userId, deviceInfo = null, ttl = 60) {
    const key = `presence:${userType}:${userId}`;
    const value = JSON.stringify({
      status: 'online',
      device: deviceInfo,
      timestamp: Date.now()
    });

    if (this.useMock) {
      this.mockStore.set(key, { value, expireAt: Date.now() + (ttl * 1000) });
      return true;
    }

    try {
      await this.client.setex(key, ttl, value);
      return true;
    } catch (error) {
      console.error('[RedisService] setUserOnline error:', error);
      return false;
    }
  }

  async setUserOffline(userType, userId) {
    const key = `presence:${userType}:${userId}`;

    if (this.useMock) {
      this.mockStore.delete(key);
      return true;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('[RedisService] setUserOffline error:', error);
      return false;
    }
  }

  async getUserPresence(userType, userId) {
    const key = `presence:${userType}:${userId}`;

    if (this.useMock) {
      const data = this.mockStore.get(key);
      if (data && data.expireAt > Date.now()) {
        return JSON.parse(data.value);
      }
      return null;
    }

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[RedisService] getUserPresence error:', error);
      return null;
    }
  }

  async getOnlineUsers(userType) {
    const pattern = `presence:${userType}:*`;

    if (this.useMock) {
      const users = [];
      const now = Date.now();
      for (const [key, data] of this.mockStore.entries()) {
        if (key.startsWith(`presence:${userType}:`) && data.expireAt > now) {
          const userId = key.split(':')[2];
          users.push({ id: parseInt(userId), ...JSON.parse(data.value) });
        }
      }
      return users;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return [];

      const pipeline = this.client.pipeline();
      keys.forEach(key => pipeline.get(key));
      const results = await pipeline.exec();

      return results
        .filter(([err, val]) => !err && val)
        .map(([_, val], index) => {
          const userId = keys[index].split(':')[2];
          return { id: parseInt(userId), ...JSON.parse(val) };
        });
    } catch (error) {
      console.error('[RedisService] getOnlineUsers error:', error);
      return [];
    }
  }

  async bulkGetPresence(userType, userIds) {
    if (!userIds || userIds.length === 0) return {};

    if (this.useMock) {
      const result = {};
      const now = Date.now();
      for (const userId of userIds) {
        const key = `presence:${userType}:${userId}`;
        const data = this.mockStore.get(key);
        result[userId] = data && data.expireAt > now ? JSON.parse(data.value) : null;
      }
      return result;
    }

    try {
      const pipeline = this.client.pipeline();
      userIds.forEach(id => pipeline.get(`presence:${userType}:${id}`));
      const results = await pipeline.exec();

      const presenceMap = {};
      results.forEach(([err, val], index) => {
        presenceMap[userIds[index]] = !err && val ? JSON.parse(val) : null;
      });
      return presenceMap;
    } catch (error) {
      console.error('[RedisService] bulkGetPresence error:', error);
      return {};
    }
  }

  // ==================== TYPING INDICATORS ====================

  async setTyping(roomId, userType, userId, userName, ttl = 5) {
    const key = `typing:${roomId}:${userType}:${userId}`;
    const value = JSON.stringify({ userName, timestamp: Date.now() });

    if (this.useMock) {
      this.mockStore.set(key, { value, expireAt: Date.now() + (ttl * 1000) });
      return true;
    }

    try {
      await this.client.setex(key, ttl, value);
      return true;
    } catch (error) {
      console.error('[RedisService] setTyping error:', error);
      return false;
    }
  }

  async getTypingUsers(roomId) {
    const pattern = `typing:${roomId}:*`;

    if (this.useMock) {
      const users = [];
      const now = Date.now();
      for (const [key, data] of this.mockStore.entries()) {
        if (key.startsWith(`typing:${roomId}:`) && data.expireAt > now) {
          users.push(JSON.parse(data.value));
        }
      }
      return users;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return [];

      const pipeline = this.client.pipeline();
      keys.forEach(key => pipeline.get(key));
      const results = await pipeline.exec();

      return results
        .filter(([err, val]) => !err && val)
        .map(([_, val]) => JSON.parse(val));
    } catch (error) {
      console.error('[RedisService] getTypingUsers error:', error);
      return [];
    }
  }

  // ==================== PUB/SUB ====================

  async publish(channel, message) {
    const data = typeof message === 'string' ? message : JSON.stringify(message);

    if (this.useMock) {
      const subscribers = this.mockSubscribers.get(channel) || [];
      subscribers.forEach(callback => callback(channel, data));
      return subscribers.length;
    }

    try {
      return await this.publisher.publish(channel, data);
    } catch (error) {
      console.error('[RedisService] publish error:', error);
      return 0;
    }
  }

  async subscribe(channel, callback) {
    if (this.useMock) {
      if (!this.mockSubscribers.has(channel)) {
        this.mockSubscribers.set(channel, []);
      }
      this.mockSubscribers.get(channel).push(callback);
      return true;
    }

    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          callback(ch, message);
        }
      });
      return true;
    } catch (error) {
      console.error('[RedisService] subscribe error:', error);
      return false;
    }
  }

  async unsubscribe(channel) {
    if (this.useMock) {
      this.mockSubscribers.delete(channel);
      return true;
    }

    try {
      await this.subscriber.unsubscribe(channel);
      return true;
    } catch (error) {
      console.error('[RedisService] unsubscribe error:', error);
      return false;
    }
  }

  // ==================== CACHING ====================

  async set(key, value, ttl = 300) {
    const data = typeof value === 'string' ? value : JSON.stringify(value);

    if (this.useMock) {
      this.mockStore.set(key, { value: data, expireAt: Date.now() + (ttl * 1000) });
      return true;
    }

    try {
      await this.client.setex(key, ttl, data);
      return true;
    } catch (error) {
      console.error('[RedisService] set error:', error);
      return false;
    }
  }

  async get(key) {
    if (this.useMock) {
      const data = this.mockStore.get(key);
      if (data && data.expireAt > Date.now()) {
        try {
          return JSON.parse(data.value);
        } catch {
          return data.value;
        }
      }
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      console.error('[RedisService] get error:', error);
      return null;
    }
  }

  async del(key) {
    if (this.useMock) {
      this.mockStore.delete(key);
      return true;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('[RedisService] del error:', error);
      return false;
    }
  }

  // ==================== RATE LIMITING ====================

  async checkRateLimit(key, limit, windowSeconds) {
    const rateLimitKey = `ratelimit:${key}`;

    if (this.useMock) {
      const data = this.mockStore.get(rateLimitKey);
      const now = Date.now();

      if (!data || data.expireAt < now) {
        this.mockStore.set(rateLimitKey, {
          value: '1',
          expireAt: now + (windowSeconds * 1000)
        });
        return { allowed: true, remaining: limit - 1 };
      }

      const count = parseInt(data.value) + 1;
      if (count > limit) {
        return { allowed: false, remaining: 0 };
      }

      data.value = count.toString();
      return { allowed: true, remaining: limit - count };
    }

    try {
      const current = await this.client.incr(rateLimitKey);
      if (current === 1) {
        await this.client.expire(rateLimitKey, windowSeconds);
      }

      if (current > limit) {
        return { allowed: false, remaining: 0 };
      }

      return { allowed: true, remaining: limit - current };
    } catch (error) {
      console.error('[RedisService] checkRateLimit error:', error);
      return { allowed: true, remaining: limit };
    }
  }

  // ==================== ROOM MESSAGES CACHE ====================

  async cacheRoomMessages(roomId, messages, ttl = 300) {
    const key = `room:${roomId}:messages`;
    return this.set(key, messages, ttl);
  }

  async getCachedRoomMessages(roomId) {
    const key = `room:${roomId}:messages`;
    return this.get(key);
  }

  async invalidateRoomCache(roomId) {
    const key = `room:${roomId}:messages`;
    return this.del(key);
  }

  // ==================== PRESENCE PUBLISH ====================

  async publishPresenceChange(userType, userId, status) {
    return this.publish('presence:changes', {
      userType,
      userId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  async publishMessageStatus(roomId, messageId, status, data) {
    return this.publish(`message:status:${roomId}`, {
      messageId,
      status,
      data,
      timestamp: new Date().toISOString()
    });
  }

  async clearTyping(roomId, userType, userId) {
    const key = `typing:${roomId}:${userType}:${userId}`;
    return this.del(key);
  }

  // ==================== CLEANUP ====================

  async disconnect() {
    if (this.useMock) {
      this.mockStore.clear();
      this.mockSubscribers.clear();
      return;
    }

    try {
      if (this.client) await this.client.quit();
      if (this.subscriber) await this.subscriber.quit();
      if (this.publisher) await this.publisher.quit();
      console.log('[RedisService] Disconnected from Redis');
    } catch (error) {
      console.error('[RedisService] disconnect error:', error);
    }
  }
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;
