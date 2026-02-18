/**
 * CacheService - Redis üstü uygulama cache katmanı
 * RedisService'in üzerinde çalışır, Redis yoksa in-memory fallback kullanır
 */

const RedisService = require('./RedisService');

class CacheService {
    constructor() {
        this.localCache = new Map();
        this.ttlTimers = new Map();
        this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    }

    /**
     * Cache'den veri al
     * @param {string} key - Cache anahtarı
     * @returns {Promise<any>} Cached değer veya null
     */
    async get(key) {
        try {
            // Önce Redis dene
            const redisValue = await RedisService.get(key);
            if (redisValue) {
                this.stats.hits++;
                try { return JSON.parse(redisValue); } catch { return redisValue; }
            }
        } catch (e) { /* Redis yoksa fallback */ }

        // In-memory fallback
        if (this.localCache.has(key)) {
            this.stats.hits++;
            return this.localCache.get(key);
        }

        this.stats.misses++;
        return null;
    }

    /**
     * Cache'e veri yaz
     * @param {string} key - Cache anahtarı
     * @param {any} value - Kaydedilecek değer
     * @param {number} ttlSeconds - Yaşam süresi (saniye), default 300 (5dk)
     */
    async set(key, value, ttlSeconds = 300) {
        this.stats.sets++;

        try {
            await RedisService.set(key, JSON.stringify(value), ttlSeconds);
        } catch (e) { /* Redis yoksa fallback */ }

        // Her zaman in-memory'ye de kaydet (Redis çökerse fallback)
        this.localCache.set(key, value);

        // TTL timer
        if (this.ttlTimers.has(key)) {
            clearTimeout(this.ttlTimers.get(key));
        }
        this.ttlTimers.set(key, setTimeout(() => {
            this.localCache.delete(key);
            this.ttlTimers.delete(key);
        }, ttlSeconds * 1000));
    }

    /**
     * Cache'den veri sil
     * @param {string} key - Cache anahtarı
     */
    async delete(key) {
        this.stats.deletes++;

        try {
            await RedisService.del(key);
        } catch (e) { /* ignore */ }

        this.localCache.delete(key);
        if (this.ttlTimers.has(key)) {
            clearTimeout(this.ttlTimers.get(key));
            this.ttlTimers.delete(key);
        }
    }

    /**
     * Pattern ile toplu silme
     * @param {string} pattern - Prefix pattern (ör: 'user:*')
     */
    async deletePattern(pattern) {
        const prefix = pattern.replace('*', '');

        // Local cache
        for (const key of this.localCache.keys()) {
            if (key.startsWith(prefix)) {
                this.localCache.delete(key);
                if (this.ttlTimers.has(key)) {
                    clearTimeout(this.ttlTimers.get(key));
                    this.ttlTimers.delete(key);
                }
            }
        }

        // Redis pattern delete
        try {
            await RedisService.deletePattern(pattern);
        } catch (e) { /* ignore */ }
    }

    /**
     * Cache-aside pattern: varsa cache'den al, yoksa loader ile yükle ve cache'e kaydet
     * @param {string} key - Cache anahtarı
     * @param {Function} loader - Cache miss durumunda çağrılacak async fonksiyon
     * @param {number} ttlSeconds - TTL (saniye)
     * @returns {Promise<any>} Değer
     */
    async getOrSet(key, loader, ttlSeconds = 300) {
        const cached = await this.get(key);
        if (cached !== null) return cached;

        const value = await loader();
        if (value !== null && value !== undefined) {
            await this.set(key, value, ttlSeconds);
        }
        return value;
    }

    /**
     * Tüm cache'i temizle
     */
    async flush() {
        this.localCache.clear();
        for (const timer of this.ttlTimers.values()) {
            clearTimeout(timer);
        }
        this.ttlTimers.clear();

        try {
            await RedisService.flushAll();
        } catch (e) { /* ignore */ }
    }

    /**
     * Cache istatistikleri
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) + '%' : '0%',
            localCacheSize: this.localCache.size
        };
    }
}

module.exports = new CacheService();
