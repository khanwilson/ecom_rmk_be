"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
@(0, swagger_1.ApiTags)('redis')
@(0, common_1.Controller)('redis')
class RedisController {
    redisService;
    constructor(redisService) {
        this.redisService = redisService;
    }
    @(0, common_1.Get)('health')
    @(0, swagger_1.ApiOperation)({ summary: 'Check Redis connection health' })
    async healthCheck() {
        try {
            await this.redisService.set('health_check', 'ok', 10);
            const value = await this.redisService.get('health_check');
            await this.redisService.del('health_check');
            return {
                status: 'ok',
                redis: 'connected',
                test: value === 'ok' ? 'passed' : 'failed',
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                status: 'error',
                redis: 'disconnected',
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }
    @(0, common_1.Post)('cache')
    @(0, swagger_1.ApiOperation)({ summary: 'Set a value in cache' })
    async setCache(
    @(0, common_1.Body)()
    body) {
        await this.redisService.set(body.key, body.value, body.ttl);
        return {
            success: true,
            message: `Key '${body.key}' cached successfully`,
            ttl: body.ttl || null,
        };
    }
    @(0, common_1.Get)('cache/:key')
    @(0, swagger_1.ApiOperation)({ summary: 'Get a value from cache' })
    async getCache(
    @(0, common_1.Param)('key')
    key) {
        const value = await this.redisService.get(key);
        const ttl = value ? await this.redisService.ttl(key) : null;
        return {
            key,
            value,
            found: value !== null,
            ttl: (ttl ?? 0) > 0 ? ttl : null,
        };
    }
    @(0, common_1.Delete)('cache/:key')
    @(0, swagger_1.ApiOperation)({ summary: 'Delete a key from cache' })
    async deleteCache(
    @(0, common_1.Param)('key')
    key) {
        await this.redisService.del(key);
        return {
            success: true,
            message: `Key '${key}' deleted from cache`,
        };
    }
    @(0, common_1.Get)('example/cached')
    @(0, swagger_1.ApiOperation)({ summary: 'Example of manual caching' })
    async cachedEndpoint() {
        const cacheKey = 'example:cached';
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return {
                ...cached,
                fromCache: true,
            };
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const response = {
            message: 'This response is cached for 30 seconds',
            timestamp: new Date().toISOString(),
            fromCache: false,
        };
        await this.redisService.set(cacheKey, response, 30);
        return response;
    }
    @(0, common_1.Get)('example/rate-limit')
    @(0, swagger_1.ApiOperation)({ summary: 'Example of manual rate limiting with Redis incr + expire' })
    async rateLimitedEndpoint(
    @(0, common_1.Ip)()
    ip) {
        const key = `rate-limit:api:${ip}`;
        const result = await this.redisService.checkRateLimit(key, 3, 60);
        if (!result.allowed) {
            const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                message: 'Rate limit exceeded',
                retryAfter,
                resetAt: new Date(result.resetAt).toISOString(),
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        return {
            message: 'You can call this endpoint 3 times per minute',
            ip,
            remaining: result.remaining,
            resetAt: new Date(result.resetAt).toISOString(),
            timestamp: new Date().toISOString(),
        };
    }
    @(0, common_1.Post)('example/debounce')
    @(0, swagger_1.ApiOperation)({ summary: 'Example of debounced endpoint' })
    async debouncedEndpoint(
    @(0, common_1.Body)()
    body) {
        const debounceKey = `debounce:${body.action}`;
        const allowed = await this.redisService.debounce(debounceKey, 5);
        if (!allowed) {
            return {
                success: false,
                message: 'Please wait 5 seconds before trying again',
                action: body.action,
            };
        }
        return {
            success: true,
            message: 'Action executed',
            action: body.action,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.RedisController = RedisController;
