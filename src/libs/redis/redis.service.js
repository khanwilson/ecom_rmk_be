"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importStar(require("ioredis"));
@(0, common_1.Injectable)()
class RedisService {
    configService;
    redis;
    constructor(configService) {
        this.configService = configService;
        const clusterNodesEnv = this.configService.get('REDIS_CLUSTER_NODES');
        const retryStrategy = (times) => {
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
            this.redis = new ioredis_1.Cluster(nodes, {
                redisOptions: {
                    connectTimeout: 10000,
                },
                clusterRetryStrategy: retryStrategy,
                enableReadyCheck: true,
            });
        }
        else {
            const host = this.configService.get('REDIS_HOST', 'localhost');
            const port = this.configService.get('REDIS_PORT', 6379);
            this.redis = new ioredis_1.default({
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
        }
        catch (error) {
            console.warn('⚠️ Redis is not ready yet, but will retry in background...');
        }
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
    async get(key) {
        const value = await this.redis.get(key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    async set(key, value, ttl) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        if (ttl) {
            await this.redis.setex(key, ttl, stringValue);
        }
        else {
            await this.redis.set(key, stringValue);
        }
    }
    async del(...keys) {
        return await this.redis.del(...keys);
    }
    async exists(key) {
        const result = await this.redis.exists(key);
        return result === 1;
    }
    async expire(key, seconds) {
        const result = await this.redis.expire(key, seconds);
        return result === 1;
    }
    async ttl(key) {
        return await this.redis.ttl(key);
    }
    async getOrSet(key, factory, ttl) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        const value = await factory();
        await this.set(key, value, ttl);
        return value;
    }
    async incr(key) {
        return await this.redis.incr(key);
    }
    async incrby(key, amount) {
        return await this.redis.incrby(key, amount);
    }
    async decr(key) {
        return await this.redis.decr(key);
    }
    async checkRateLimit(key, limit, windowSeconds) {
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
    async debounce(key, delaySeconds) {
        const exists = await this.exists(key);
        if (exists) {
            return false;
        }
        await this.redis.setex(key, delaySeconds, '1');
        return true;
    }
    async throttle(key, maxCalls, windowSeconds) {
        const result = await this.checkRateLimit(key, maxCalls, windowSeconds);
        return result.allowed;
    }
    async mget(...keys) {
        const values = await this.redis.mget(...keys);
        return values.map((v) => (v ? JSON.parse(v) : null));
    }
    async mset(data) {
        const pairs = [];
        for (const [key, value] of Object.entries(data)) {
            pairs.push(key, JSON.stringify(value));
        }
        await this.redis.mset(...pairs);
    }
    async keys(pattern) {
        return await this.redis.keys(pattern);
    }
    async deletePattern(pattern) {
        const keys = await this.keys(pattern);
        if (keys.length === 0)
            return 0;
        return await this.del(...keys);
    }
    async flushall() {
        await this.redis.flushall();
    }
    getClient() {
        return this.redis;
    }
}
exports.RedisService = RedisService;
