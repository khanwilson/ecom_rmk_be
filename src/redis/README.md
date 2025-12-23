# Redis Module

Pure **ioredis** integration for distributed caching, rate limiting, and session management in microservices architecture.

## Features

- ✅ Distributed cache (shared across all services)
- ✅ Distributed rate limiting with Redis expire
- ✅ Session storage with TTL
- ✅ Distributed locking for concurrency control
- ✅ Cache-aside pattern
- ✅ Debounce and throttle mechanisms
- ✅ Counters and increments
- ✅ Perfect for microservices + Kafka architecture

## Configuration

Redis is configured via environment variables:

```env
REDIS_HOST=redis        # For Docker
# REDIS_HOST=localhost  # For local dev
REDIS_PORT=6379
```

## Basic Usage

### 1. Inject RedisService

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from './redis/redis.service';

@Injectable()
export class YourService {
  constructor(private readonly redisService: RedisService) {}
}
```

### 2. Set and Get Values

```typescript
// Set value with TTL (seconds)
await this.redisService.set('key', 'value', 60);

// Get value
const value = await this.redisService.get('key');

// Delete key
await this.redisService.del('key');

// Check if key exists
const exists = await this.redisService.exists('key');
```

### 3. Cache-Aside Pattern

```typescript
const userData = await this.redisService.getOrSet(
  'user:123',
  async () => {
    // This runs only on cache miss
    return await this.database.findUser(123);
  },
  300, // Cache for 5 minutes
);
```

## Advanced Usage

### 1. Rate Limiting in Controller (Manual with Redis incr + expire)

```typescript
import { Controller, Post, Ip, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from './redis/redis.service';

@Controller('api')
export class ApiController {
  constructor(private readonly redisService: RedisService) {}

  @Post('login')
  async login(@Ip() ip: string, @Body() body: any) {
    // Rate limit: 5 login attempts per minute per IP
    const rateLimitKey = `rate:login:${ip}`;
    const result = await this.redisService.checkRateLimit(rateLimitKey, 5, 60);

    if (!result.allowed) {
      throw new HttpException(
        {
          message: 'Too many login attempts',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Process login...
    return {
      success: true,
      remaining: result.remaining,
    };
  }

  @Post('order')
  async createOrder(@Body() body: { userId: string }) {
    // Rate limit: 10 orders per hour per user
    const rateLimitKey = `rate:order:${body.userId}`;
    const result = await this.redisService.checkRateLimit(rateLimitKey, 10, 3600);

    if (!result.allowed) {
      throw new HttpException('Too many orders', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Create order...
  }
}
```

### 2. Rate Limiting in Kafka Consumer

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class OrderConsumer {
  private readonly logger = new Logger(OrderConsumer.name);

  constructor(private readonly redisService: RedisService) {}

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: any) {
    // Rate limit: Max 5 orders per user per minute
    const rateLimitKey = `consumer:order:${data.userId}`;
    const result = await this.redisService.checkRateLimit(rateLimitKey, 5, 60);

    if (!result.allowed) {
      this.logger.warn(`Rate limit exceeded for user ${data.userId} - skipping event`);
      return; // Skip processing
    }

    this.logger.log(`Processing order ${data.orderId} (remaining: ${result.remaining})`);
    // Process order...
  }
}
```

### 3. Debounce in Kafka Consumer

```typescript
@EventPattern('user.profile.updated')
async handleProfileUpdate(@Payload() data: any) {
  // Debounce: Only send notification once per 5 minutes
  const debounceKey = `debounce:notification:${data.userId}`;
  const allowed = await this.redisService.debounce(debounceKey, 300);

  if (!allowed) {
    this.logger.warn('Notification already sent recently - skipping');
    return;
  }

  // Send notification...
  await this.notificationService.send(data.userId);
}
```

### 4. Throttle for API Forwarding

```typescript
@EventPattern('analytics.event')
async handleAnalyticsEvent(@Payload() data: any) {
  // Throttle: Forward max 100 events per minute to external API
  const throttleKey = 'throttle:analytics:forward';
  const allowed = await this.redisService.throttle(throttleKey, 100, 60);

  if (!allowed) {
    this.logger.debug('Throttled analytics event - skipping forward');
    return;
  }

  // Forward to external analytics API
  await this.httpService.post('https://analytics.example.com', data);
}
```

## API Endpoints

### Health Check

```bash
GET /redis/health
```

Response:
```json
{
  "status": "ok",
  "redis": "connected",
  "test": "passed"
}
```

### Manual Cache Operations

**Set cache:**
```bash
POST /redis/cache
{
  "key": "mykey",
  "value": {"data": "something"},
  "ttl": 300
}
```

**Get cache:**
```bash
GET /redis/cache/mykey
```

**Delete cache:**
```bash
DELETE /redis/cache/mykey
```

### Example Cached Endpoint

```bash
GET /redis/example/cached
```

First request takes ~2 seconds (simulated slow operation).
Subsequent requests are instant (served from cache) for 30 seconds.

## Use Cases

### 1. Database Query Caching

```typescript
async getUserProfile(userId: string) {
  return this.redisService.getOrSet(
    `user:profile:${userId}`,
    async () => await this.db.users.findOne({ id: userId }),
    600, // 10 minutes
  );
}
```

### 2. API Response Caching

```typescript
@Get('expensive-operation')
async expensiveOperation() {
  const cacheKey = 'expensive:result';
  
  return this.redisService.getOrSet(
    cacheKey,
    async () => {
      // Expensive computation
      return await this.calculateExpensiveResult();
    },
    300 // Cache for 5 minutes
  );
}
```

### 3. Session Management

```typescript
// Store session
const sessionId = generateId();
await redisService.set(`session:${sessionId}`, userData, 3600);

// Get session
const session = await redisService.get(`session:${sessionId}`);

// Delete session (logout)
await redisService.del(`session:${sessionId}`);
```

### 4. Distributed Lock (Prevents duplicate operations across services)

```typescript
const lockKey = `lock:process-payment:${orderId}`;
const locked = await redisService.exists(lockKey);

if (locked) {
  throw new Error('Payment already being processed by another service');
}

await redisService.set(lockKey, 'locked', 30);
try {
  await processPayment(orderId);
} finally {
  await redisService.del(lockKey);
}
```

## Testing

### Test Redis Connection

```bash
# Check health
curl http://localhost:3000/redis/health

# Set a value
curl -X POST http://localhost:3000/redis/cache \
  -H "Content-Type: application/json" \
  -d '{"key": "test", "value": "hello", "ttl": 60}'

# Get the value
curl http://localhost:3000/redis/cache/test

# Test cached endpoint (first request slow, then fast)
time curl http://localhost:3000/redis/example/cached
time curl http://localhost:3000/redis/example/cached  # This one is instant!
```

### Monitor Redis

```bash
# Connect to Redis CLI
docker exec -it redis redis-cli

# See all keys
KEYS *

# Get a value
GET "key"

# Monitor all commands in real-time
MONITOR
```

## Best Practices

1. **Always set TTL** - Prevent memory leaks
2. **Use meaningful key names** - e.g., `user:123`, `product:456`
3. **Invalidate on updates** - Delete cache when data changes
4. **Handle cache misses gracefully** - Always have fallback
5. **Don't cache everything** - Only cache expensive operations
6. **Monitor memory usage** - Redis has memory limits

## Why Manual Rate Limiting (No Guard)?

Using `redisService.checkRateLimit()` directly instead of guard/decorator gives you:

1. **Flexible Keys**: Rate limit by user, IP, endpoint, action, or any combination
2. **Different Limits**: Each endpoint can have different limits and windows
3. **Business Logic**: Apply rate limiting conditionally based on user role, plan, etc.
4. **Kafka Consumers**: Can't use guards in Kafka consumers, need manual approach
5. **Custom Responses**: Return custom error messages with `retryAfter` info
6. **Better for Microservices**: More control over distributed rate limiting

```typescript
// ❌ Guard approach (like @nestjs/throttler) - Too rigid
@RateLimit({ limit: 10, window: 60 })
@Post('action')

// ✅ Manual approach - Full control
@Post('action')
async action(@Body() body: { userId: string }) {
  const key = `rate:action:${body.userId}`;
  const result = await this.redisService.checkRateLimit(key, 10, 60);
  // Full control of response, logging, business logic
}
```

## Microservices Architecture

Redis is perfect for microservices because it provides:

1. **Shared State**: All service instances read from same Redis
2. **Distributed Rate Limiting**: User rate limit applies across ALL services and Kafka consumers
3. **Distributed Cache**: One service caches, all services benefit
4. **Distributed Locks**: Prevent race conditions across services
5. **Event Debouncing**: Prevent duplicate event processing across consumers

### Example: Login Rate Limiting

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Service A   │     │  Service B   │     │  Service C   │
│  Instance 1  │     │  Instance 2  │     │  Instance 3  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            ▼
                    ┌────────────────┐
                    │     Redis      │
                    │ rate:user:123  │
                    │   count: 5     │
                    │   TTL: 900s    │
                    └────────────────┘

User tries to login:
- Service A: counts (1, 2, 3)
- Service B: counts (4, 5)
- Service C: BLOCKED (> 5) ✅
```

## Performance Tips

- Cache expensive database queries (>100ms)
- Cache external API calls
- Use appropriate TTL (not too long, not too short)
- Monitor Redis memory usage
- Use bulk operations (mget, mset) when possible
- Implement cache warming for critical data
- Use Redis pipelining for multiple operations

## Integration with Kafka

Perfect combo for event-driven microservices:

```typescript
// Service A: Create order
const order = await this.createOrder(data);
await this.redis.set(`order:${order.id}`, order, 3600);
this.kafka.emit('order.created', order);

// Service B: Listen and use cache
@EventPattern('order.created')
async onOrderCreated(data) {
  // Get cached user data (set by Auth Service)
  const user = await this.redis.get(`user:${data.userId}`);
  if (user) {
    // Use cached data - no DB query needed!
  }
}
```

## More Examples

- **Basic caching**: `src/redis/examples/cache.example.ts`
- **Microservices**: `src/redis/examples/microservices.example.ts`
- **Rate limiting**: See controller examples above

