const redis = require('redis');
const { promisify } = require('util');
const { logger } = require('../utils/logger');
const config = require('../../config');

class RedisService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.mockMode = !config.redis.url || config.redis.url.includes('localhost');
    
    if (this.mockMode) {
      logger.info('Redis running in MOCK mode for development');
      this.mockCache = new Map();
      this.mockTTL = new Map();
    } else {
      this.connect();
    }
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: config.redis.url,
        password: config.redis.password,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Promisify Redis methods
      this.getAsync = promisify(this.client.get).bind(this.client);
      this.setAsync = promisify(this.client.set).bind(this.client);
      this.delAsync = promisify(this.client.del).bind(this.client);
      this.existsAsync = promisify(this.client.exists).bind(this.client);
      this.expireAsync = promisify(this.client.expire).bind(this.client);
      this.ttlAsync = promisify(this.client.ttl).bind(this.client);
      this.incrAsync = promisify(this.client.incr).bind(this.client);
      this.decrAsync = promisify(this.client.decr).bind(this.client);
      this.hgetAsync = promisify(this.client.hget).bind(this.client);
      this.hsetAsync = promisify(this.client.hset).bind(this.client);
      this.hgetallAsync = promisify(this.client.hgetall).bind(this.client);
      this.zaddAsync = promisify(this.client.zadd).bind(this.client);
      this.zrangeAsync = promisify(this.client.zrange).bind(this.client);
      this.zrevrangeAsync = promisify(this.client.zrevrange).bind(this.client);

      this.client.on('connect', () => {
        this.connected = true;
        logger.info('Redis connected successfully');
      });

      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
        this.connected = false;
      });

      this.client.on('end', () => {
        this.connected = false;
        logger.info('Redis connection closed');
      });

    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  // Cache operations with mock fallback
  async get(key) {
    if (this.mockMode) {
      this.cleanExpiredMockKeys();
      return this.mockCache.get(key);
    }
    
    try {
      const value = await this.getAsync(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (this.mockMode) {
      this.mockCache.set(key, value);
      if (ttl) {
        this.mockTTL.set(key, Date.now() + (ttl * 1000));
      }
      return true;
    }
    
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.setAsync(key, serialized, 'EX', ttl);
      } else {
        await this.setAsync(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async del(key) {
    if (this.mockMode) {
      this.mockCache.delete(key);
      this.mockTTL.delete(key);
      return true;
    }
    
    try {
      await this.delAsync(key);
      return true;
    } catch (error) {
      logger.error('Redis del error:', error);
      return false;
    }
  }

  async exists(key) {
    if (this.mockMode) {
      this.cleanExpiredMockKeys();
      return this.mockCache.has(key);
    }
    
    try {
      const exists = await this.existsAsync(key);
      return exists === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  // Cache patterns
  async cacheWrap(key, fn, ttl = 3600) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  // Specific cache methods
  async cacheSalesStats(stats) {
    return await this.set('stats:sales', stats, 30); // 30 seconds TTL
  }

  async getCachedSalesStats() {
    return await this.get('stats:sales');
  }

  async cacheLeaderboard(period, data) {
    return await this.set(`leaderboard:${period}`, data, 300); // 5 minutes TTL
  }

  async getCachedLeaderboard(period) {
    return await this.get(`leaderboard:${period}`);
  }

  async cacheGameSession(sessionId, data) {
    return await this.set(`game:session:${sessionId}`, data, 3600); // 1 hour TTL
  }

  async getGameSession(sessionId) {
    return await this.get(`game:session:${sessionId}`);
  }

  async cachePurchase(invoiceId, data) {
    return await this.set(`purchase:${invoiceId}`, data, 86400); // 24 hours TTL
  }

  async getCachedPurchase(invoiceId) {
    return await this.get(`purchase:${invoiceId}`);
  }

  // Rate limiting
  async checkRateLimit(key, limit, window) {
    if (this.mockMode) {
      const count = this.mockCache.get(key) || 0;
      if (count >= limit) {
        return { allowed: false, remaining: 0 };
      }
      this.mockCache.set(key, count + 1);
      this.mockTTL.set(key, Date.now() + (window * 1000));
      return { allowed: true, remaining: limit - count - 1 };
    }

    try {
      const current = await this.incrAsync(key);
      if (current === 1) {
        await this.expireAsync(key, window);
      }
      
      if (current > limit) {
        const ttl = await this.ttlAsync(key);
        return { allowed: false, remaining: 0, retryAfter: ttl };
      }
      
      return { allowed: true, remaining: limit - current };
    } catch (error) {
      logger.error('Rate limit check error:', error);
      return { allowed: true, remaining: limit };
    }
  }

  // Leaderboard operations
  async updateLeaderboard(score, playerId) {
    const key = `leaderboard:${new Date().toISOString().split('T')[0]}`;
    
    if (this.mockMode) {
      // Simple mock implementation
      const leaderboard = this.mockCache.get(key) || [];
      leaderboard.push({ score, playerId, timestamp: Date.now() });
      leaderboard.sort((a, b) => b.score - a.score);
      this.mockCache.set(key, leaderboard.slice(0, 100));
      return true;
    }

    try {
      await this.zaddAsync(key, score, playerId);
      await this.expireAsync(key, 86400 * 7); // Keep for 7 days
      return true;
    } catch (error) {
      logger.error('Leaderboard update error:', error);
      return false;
    }
  }

  async getTopScores(limit = 10) {
    const key = `leaderboard:${new Date().toISOString().split('T')[0]}`;
    
    if (this.mockMode) {
      const leaderboard = this.mockCache.get(key) || [];
      return leaderboard.slice(0, limit);
    }

    try {
      const scores = await this.zrevrangeAsync(key, 0, limit - 1, 'WITHSCORES');
      const result = [];
      for (let i = 0; i < scores.length; i += 2) {
        result.push({
          playerId: scores[i],
          score: parseInt(scores[i + 1])
        });
      }
      return result;
    } catch (error) {
      logger.error('Get top scores error:', error);
      return [];
    }
  }

  // Session management
  async createSession(sessionId, data, ttl = 3600) {
    const key = `session:${sessionId}`;
    return await this.set(key, data, ttl);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  async destroySession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }

  // Analytics
  async incrementCounter(metric) {
    const key = `counter:${metric}:${new Date().toISOString().split('T')[0]}`;
    
    if (this.mockMode) {
      const current = this.mockCache.get(key) || 0;
      this.mockCache.set(key, current + 1);
      return current + 1;
    }

    try {
      const value = await this.incrAsync(key);
      await this.expireAsync(key, 86400 * 30); // Keep for 30 days
      return value;
    } catch (error) {
      logger.error('Increment counter error:', error);
      return 0;
    }
  }

  // Clean expired mock keys
  cleanExpiredMockKeys() {
    if (!this.mockMode) return;
    
    const now = Date.now();
    for (const [key, expiry] of this.mockTTL.entries()) {
      if (expiry < now) {
        this.mockCache.delete(key);
        this.mockTTL.delete(key);
      }
    }
  }

  // Health check
  async checkHealth() {
    if (this.mockMode) {
      return { healthy: true, mode: 'mock' };
    }

    try {
      if (!this.connected) {
        return { healthy: false, error: 'Not connected' };
      }
      
      // Ping Redis
      const testKey = 'health:check';
      await this.setAsync(testKey, Date.now(), 'EX', 10);
      const value = await this.getAsync(testKey);
      
      return { 
        healthy: true, 
        latency: Date.now() - parseInt(value),
        connected: this.connected
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  // Disconnect
  disconnect() {
    if (this.client && this.connected) {
      this.client.quit();
      this.connected = false;
      logger.info('Redis disconnected');
    }
  }
}

module.exports = new RedisService();