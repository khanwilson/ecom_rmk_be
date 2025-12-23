import { Controller, Get, Post, Delete, Body, Param, Ip, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RedisService } from './redis.service';

@ApiTags('redis')
@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check Redis connection health' })
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
    } catch (error) {
      return {
        status: 'error',
        redis: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('cache')
  @ApiOperation({ summary: 'Set a value in cache' })
  async setCache(@Body() body: { key: string; value: any; ttl?: number }) {
    await this.redisService.set(body.key, body.value, body.ttl);
    return {
      success: true,
      message: `Key '${body.key}' cached successfully`,
      ttl: body.ttl || null,
    };
  }

  @Get('cache/:key')
  @ApiOperation({ summary: 'Get a value from cache' })
  async getCache(@Param('key') key: string) {
    const value = await this.redisService.get(key);
    const ttl = value ? await this.redisService.ttl(key) : null;
    
    return {
      key,
      value,
      found: value !== null,
      ttl: (ttl ?? 0) > 0 ? ttl : null,
    };
  }

  @Delete('cache/:key')
  @ApiOperation({ summary: 'Delete a key from cache' })
  async deleteCache(@Param('key') key: string) {
    await this.redisService.del(key);
    return {
      success: true,
      message: `Key '${key}' deleted from cache`,
    };
  }

  @Get('example/cached')
  @ApiOperation({ summary: 'Example of manual caching' })
  async cachedEndpoint() {
    const cacheKey = 'example:cached';
    
    // Try to get from cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
      };
    }
    
    // Simulate slow operation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const response = {
      message: 'This response is cached for 30 seconds',
      timestamp: new Date().toISOString(),
      fromCache: false,
    };
    
    // Store in cache for 30 seconds
    await this.redisService.set(cacheKey, response, 30);
    
    return response;
  }

  @Get('example/rate-limit')
  @ApiOperation({ summary: 'Example of manual rate limiting with Redis incr + expire' })
  async rateLimitedEndpoint(@Ip() ip: string) {
    const key = `rate-limit:api:${ip}`;
    const result = await this.redisService.checkRateLimit(key, 3, 60); // 3 requests per 60s

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          retryAfter,
          resetAt: new Date(result.resetAt).toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return {
      message: 'You can call this endpoint 3 times per minute',
      ip,
      remaining: result.remaining,
      resetAt: new Date(result.resetAt).toISOString(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('example/debounce')
  @ApiOperation({ summary: 'Example of debounced endpoint' })
  async debouncedEndpoint(@Body() body: { action: string }) {
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

