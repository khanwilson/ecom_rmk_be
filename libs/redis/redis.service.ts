import { Injectable } from '@nestjs/common';
import Redis, { Cluster } from 'ioredis';

@Injectable()
export class RedisService {
  private redis: Redis | Cluster;

  constructor() {
    const clusterNodesEnv = process.env.REDIS_CLUSTER_NODES;

    const retryStrategy = (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    };

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
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);

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

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value as any;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      await this.redis.setex(key, ttl, stringValue);
    } else {
      await this.redis.set(key, stringValue);
    }
  }

  async del(...keys: string[]): Promise<number> {
    return await this.redis.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.redis.expire(key, seconds);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  async incrby(key: string, amount: number): Promise<number> {
    return await this.redis.incrby(key, amount);
  }

  async decr(key: string): Promise<number> {
    return await this.redis.decr(key);
  }

  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
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

    const count = parseInt(current, 10);
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

  async debounce(key: string, delaySeconds: number): Promise<boolean> {
    const exists = await this.exists(key);
    if (exists) {
      return false;
    }

    await this.redis.setex(key, delaySeconds, '1');
    return true;
  }

  async throttle(key: string, maxCalls: number, windowSeconds: number): Promise<boolean> {
    const result = await this.checkRateLimit(key, maxCalls, windowSeconds);
    return result.allowed;
  }

  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(...keys);
    return values.map((v) => (v ? JSON.parse(v) : null));
  }

  async mset(data: Record<string, any>): Promise<void> {
    const pairs: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      pairs.push(key, JSON.stringify(value));
    }
    await this.redis.mset(...pairs);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }

  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    if (keys.length === 0) return 0;
    return await this.del(...keys);
  }

  async flushall(): Promise<void> {
    await this.redis.flushall();
  }

  getClient(): Redis | Cluster {
    return this.redis;
  }
}
