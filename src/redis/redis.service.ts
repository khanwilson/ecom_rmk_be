import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Cluster } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | Cluster;

  constructor(private configService: ConfigService) {
    const clusterNodesEnv = this.configService.get<string>('REDIS_CLUSTER_NODES');

    const retryStrategy = (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    };

    // setup cluster mode
    if (clusterNodesEnv) {
      const nodes = clusterNodesEnv
        .split(',')
        .map((node) => node.trim())
        .filter((node) => !!node)
        .map((node) => {
          const [host, port] = node.split(':');
          return { host, port: Number(port) || 6379 };
        });

      this.redis = new Cluster(nodes, {
        redisOptions: {
          connectTimeout: 10000,
        },
        clusterRetryStrategy: retryStrategy,
        enableReadyCheck: true,
      });
    } else {
      // setup single node mode
      const host = this.configService.get('REDIS_HOST', 'localhost');
      const port = this.configService.get('REDIS_PORT', 6379);

      this.redis = new Redis({
        host,
        port,
        retryStrategy,
      });
    }

    this.redis.on('connect', () => {
      console.log('📡 Redis connected');
    });
  
    this.redis.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
  }

  async onModuleInit() {
    try {
      await this.redis.ping(() => {
        console.log('📡 Redis Ping Success');
      });
    } catch (error) {
      console.warn('⚠️ Redis is not ready yet, but will retry in background...');
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  // ============================================
  // Basic Operations
  // ============================================

  /**
   * Get value from Redis
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value as any;
    }
  }

  /**
   * Set value in Redis with optional Time To Live (TTL in seconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      await this.redis.setex(key, ttl, stringValue);
    } else {
      await this.redis.set(key, stringValue);
    }
  }

  /**
   * Delete key(s)
   */
  async del(...keys: string[]): Promise<number> {
    return await this.redis.del(...keys);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Set TTL on existing key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.redis.expire(key, seconds);
    return result === 1;
  }

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  // ============================================
  // Cache Patterns
  // ============================================

  /**
   * Cache-aside pattern: Get or Set
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>, // Promise call if not in cache
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }


  // ============================================
  // Rate Limiting
  // ============================================

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  /**
   * Increment by amount
   */
  async incrby(key: string, amount: number): Promise<number> {
    return await this.redis.incrby(key, amount);
  }

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    return await this.redis.decr(key);
  }

  /**
   * Simple rate limiter using incr + expire
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const current = await this.redis.get(key);

    if (!current) {
      await this.redis.setex(key, windowSeconds, '1');
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: Date.now() + windowSeconds * 1000,
      };
    }

    const count = parseInt(current);
    if (count >= limit) {
      const ttl = await this.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + ttl * 1000,
      };
    }

    await this.redis.incr(key);
    const ttl = await this.ttl(key);

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: Date.now() + ttl * 1000,
    };
  }

  // ============================================
  // Debounce / Throttle
  // ============================================

  /**
   * Debounce: Only allow if not called recently
   */
  async debounce(key: string, delaySeconds: number): Promise<boolean> {
    const exists = await this.exists(key);
    if (exists) {
      return false; // Debounced
    }

    await this.redis.setex(key, delaySeconds, '1');
    return true; // Allowed
  }

  /**
   * Throttle: Limit calls per time window
   */
  async throttle(key: string, maxCalls: number, windowSeconds: number): Promise<boolean> {
    const result = await this.checkRateLimit(key, maxCalls, windowSeconds);
    return result.allowed;
  }

  // ============================================
  // Advanced Operations
  // ============================================

  /**
   * Get multiple keys at once
   */
  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(...keys);
    return values.map((v) => (v ? JSON.parse(v) : null));
  }

  /**
   * Set multiple keys at once
   */
  async mset(data: Record<string, any>): Promise<void> {
    const pairs: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      pairs.push(key, JSON.stringify(value));
    }
    await this.redis.mset(...pairs);
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }

  /**
   * Delete all keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    if (keys.length === 0) return 0;
    return await this.del(...keys);
  }

  /**
   * Flush all data (use with caution!)
   */
  async flushall(): Promise<void> {
    await this.redis.flushall();
  }

  // ============================================
  // Direct Redis Access
  // ============================================

  /**
   * Get raw ioredis client for advanced operations
   */
  getClient(): Redis | Cluster {
    return this.redis;
  }
}

