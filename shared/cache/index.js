'use strict';
const crypto = require('crypto');

/**
 * Memory + (opsiyonel) Redis cache.
 * - in-memory hemen dondurur, redis arka planda senkron olur.
 */
class CacheManager {
  constructor(redisUrl, logger) {
    this.logger = logger;
    this.mem = new Map();
    this.redis = null;
    if (redisUrl) {
      try {
        const IORedis = require('ioredis');
        this.redis = new IORedis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: () => null
        });
        this.redis.on('error', (e) => this.logger && this.logger.debug(`Redis hata (in-memory fallback devam): ${e.message}`));
        this.redis.connect().then(() => this.logger && this.logger.info('Redis baglandi')).catch(() => {
          this.redis = null;
          if (this.logger) this.logger.info('Redis baglanamadi, in-memory cache kullanılacak');
        });
      } catch (e) {
        if (this.logger) this.logger.warn(`Redis init hata: ${e.message}`);
        this.redis = null;
      }
    }
  }

  get isRedisEnabled() {
    return !!(this.redis && this.redis.status === 'ready');
  }

  /**
   * key + data (obje) -> hemen memory'e yazilir, redis varsa async yazilir.
   */
  async set(key, data, ttlMs = 0) {
    const entry = { data, exp: ttlMs ? Date.now() + ttlMs : 0 };
    this.mem.set(key, entry);
    if (this.isRedisEnabled) {
      const value = JSON.stringify(entry);
      try { await this.redis.set(`eco:${key}`, value, 'PX', ttlMs || 0); } catch { /* ignore */ }
    }
    return data;
  }

  get(key) {
    const e = this.mem.get(key);
    if (!e) return null;
    if (e.exp && Date.now() > e.exp) { this.mem.delete(key); return null; }
    return e.data;
  }

  async getAsync(key) {
    const local = this.get(key);
    if (local !== null) return local;
    if (this.isRedisEnabled) {
      try {
        const raw = await this.redis.get(`eco:${key}`);
        if (raw) {
          const entry = JSON.parse(raw);
          if (!entry.exp || Date.now() < entry.exp) {
            this.mem.set(key, { data: entry.data, exp: entry.exp });
            return entry.data;
          }
        }
      } catch { /* ignore */ }
    }
    return null;
  }

  delete(key) {
    this.mem.delete(key);
    if (this.isRedisEnabled) this.redis.del(`eco:${key}`).catch(() => {});
  }

  invalidatePrefix(prefix) {
    for (const k of [...this.mem.keys()]) if (k.startsWith(prefix)) this.mem.delete(k);
    if (this.isRedisEnabled) {
      this.redis.keys('eco:' + prefix + '*').then((ks) => ks.length && this.redis.del(...ks)).catch(() => {});
    }
  }

  memo(ttlMs, fn) {
    const wrapped = async (...args) => {
      const key = `${fn.name || 'anon'}:${crypto.createHash('md5').update(JSON.stringify(args)).digest('hex')}`;
      const cached = await this.getAsync(key);
      if (cached) return cached;
      const result = await fn(...args);
      this.set(key, result, ttlMs);
      return result;
    };
    wrapped.invalidate = () => this.mem.clear();
    return wrapped;
  }

  close() {
    if (this.redis) {
      try { this.redis.disconnect(); } catch { /* noop */ }
    }
  }
}

module.exports = { CacheManager };
