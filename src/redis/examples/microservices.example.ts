/**
 * Redis + Kafka in Microservices Architecture
 * 
 * This example shows how to use Redis for distributed caching and rate limiting
 * across multiple microservices with Kafka for event streaming.
 * 
 * Uses manual rate limiting with Redis incr + expire (no guards/decorators)
 */

import { Body, Controller, Injectable, Post, HttpException, HttpStatus } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RedisService } from '../redis.service';

// ============================================
// SCENARIO: E-commerce with 3 microservices
// ============================================

/**
 * Service A: Authentication Service
 * Handles login, register, JWT tokens
 */
@Controller('auth')
export class AuthController {
  constructor(
    private redis: RedisService,
    // private kafka: KafkaClient,
  ) {}

  /**
   * Login endpoint with distributed rate limiting
   * Limit: 5 attempts per 15 minutes PER USER (across all services)
   */
  @Post('login')
  async login(@Body() dto: { email: string; password: string }) {
    // Rate limit: 5 login attempts per 15 minutes per email (distributed across all services)
    const rateLimitKey = `rate:login:${dto.email}`;
    const rateLimit = await this.redis.checkRateLimit(rateLimitKey, 5, 900);

    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          message: 'Too many login attempts. Try again in 15 minutes.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check if user is temporarily blocked (by ANY service)
    const blockKey = `block:user:${dto.email}`;
    const isBlocked = await this.redis.exists(blockKey);
    if (isBlocked) {
      throw new HttpException(
        'Account temporarily blocked due to suspicious activity',
        HttpStatus.FORBIDDEN,
      );
    }

    // Attempt login
    const user = await this.attemptLogin(dto.email, dto.password);

    if (!user) {
      // Failed attempt - tracked in Redis (shared across services)
      const attemptKey = `login:attempts:${dto.email}`;
      const attempts = await this.redis.incr(attemptKey);
      await this.redis.expire(attemptKey, 900); // 15 minutes

      if (attempts >= 5) {
        // Block user for 1 hour (affects ALL services)
        await this.redis.set(blockKey, 'blocked', 3600);
        
        // Emit event to Kafka for other services to react
        // await this.kafka.emit('user.blocked', {
        //   email: dto.email,
        //   reason: 'Too many failed login attempts',
        //   blockedUntil: Date.now() + 3600000,
        // });
      }

      throw new Error('Invalid credentials');
    }

    // Success - clear attempts counter
    await this.redis.del(`login:attempts:${dto.email}`);

    // Cache user session in Redis (accessible by all services)
    const sessionToken = this.generateToken();
    await this.redis.set(`session:${sessionToken}`, user, 86400); // 24 hours

    // Emit login event to Kafka
    // await this.kafka.emit('user.logged_in', {
    //   userId: user.id,
    //   email: user.email,
    //   timestamp: Date.now(),
    // });

    return { token: sessionToken, user };
  }

  private async attemptLogin(email: string, password: string) {
    // Database check
    return null; // Stub
  }

  private generateToken() {
    return Math.random().toString(36).substring(7);
  }
}

/**
 * Service B: Order Service
 * Handles order creation, payment, shipping
 */
@Controller('orders')
export class OrderController {
  constructor(
    private redis: RedisService,
    // private kafka: KafkaClient,
  ) {}

  /**
   * Create order with distributed rate limiting and checks
   */
  @Post()
  async createOrder(@Body() dto: { userId: string; items: any[] }) {
    // Rate limit: 10 orders per minute per user (distributed across all services)
    const rateLimitKey = `rate:order:${dto.userId}`;
    const rateLimit = await this.redis.checkRateLimit(rateLimitKey, 10, 60);

    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          message: 'Too many orders. Please slow down.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          remaining: rateLimit.remaining,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check if user is blocked (set by Auth Service)
    const blockKey = `block:user:${dto.userId}`;
    const isBlocked = await this.redis.exists(blockKey);
    if (isBlocked) {
      throw new HttpException(
        'Cannot create order - account blocked',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check cache for user data (shared from Auth Service)
    const user = await this.redis.getOrSet(
      `user:${dto.userId}`,
      async () => await this.fetchUserFromDB(dto.userId),
      3600,
    );

    // Prevent duplicate orders using distributed lock
    const lockKey = `lock:order:${dto.userId}`;
    const hasLock = await this.redis.exists(lockKey);
    if (hasLock) {
      throw new Error('Order already being processed');
    }

    // Acquire lock (prevents duplicate from ANY service)
    await this.redis.set(lockKey, 'processing', 10); // 10 seconds

    try {
      // Create order
      const order = await this.processOrder(dto);

      // Cache order
      await this.redis.set(`order:${order.id}`, order, 3600);

      // Emit to Kafka for other services
      // await this.kafka.emit('order.created', {
      //   orderId: order.id,
      //   userId: dto.userId,
      //   total: order.total,
      //   items: dto.items,
      // });

      return order;
    } finally {
      // Release lock
      await this.redis.del(lockKey);
    }
  }

  /**
   * Listen to Kafka events from other services
   */
  @EventPattern('user.blocked')
  async handleUserBlocked(@Payload() data: any) {
    console.log('User blocked, canceling pending orders:', data.email);
    
    // Cancel pending orders for blocked user
    // Redis already has the block flag set by Auth Service
    const blockKey = `block:user:${data.email}`;
    const isBlocked = await this.redis.exists(blockKey);
    
    if (isBlocked) {
      // Cancel orders logic
    }
  }

  private async fetchUserFromDB(userId: string) {
    return { id: userId, name: 'User' };
  }

  private async processOrder(dto: any) {
    return { id: '123', total: 100 };
  }
}

/**
 * Service C: Notification Service
 * Handles emails, SMS, push notifications
 */
@Injectable()
export class NotificationService {
  constructor(private redis: RedisService) {}

  /**
   * Listen to Kafka events and send notifications
   */
  @EventPattern('user.logged_in')
  async onUserLogin(@Payload() data: any) {
    // Debounce notification (don't spam if user logs in multiple times)
    const debounceKey = `notification:login:${data.userId}`;
    const shouldSend = await this.redis.debounce(debounceKey, 300); // 5 minutes

    if (shouldSend) {
      await this.sendLoginNotification(data);
    }
  }

  @EventPattern('order.created')
  async onOrderCreated(@Payload() data: any) {
    // Rate limit notifications: max 3 order confirmations per minute per user
    const rateLimitKey = `rate:notification:order:${data.userId}`;
    const rateLimit = await this.redis.checkRateLimit(rateLimitKey, 3, 60);

    if (!rateLimit.allowed) {
      console.log(`⚠️ Notification rate limit exceeded for user ${data.userId} - skipping`);
      return;
    }

    console.log(`📧 Sending order confirmation (remaining: ${rateLimit.remaining})`);
    await this.sendOrderConfirmation(data);
  }

  @EventPattern('user.blocked')
  async onUserBlocked(@Payload() data: any) {
    // Always send security notifications (no throttle)
    await this.sendSecurityAlert(data);
  }

  private async sendLoginNotification(data: any) {
    console.log('Sending login notification:', data);
  }

  private async sendOrderConfirmation(data: any) {
    console.log('Sending order confirmation:', data);
  }

  private async sendSecurityAlert(data: any) {
    console.log('Sending security alert:', data);
  }
}

// ============================================
// KEY BENEFITS:
// ============================================

/**
 * 1. DISTRIBUTED RATE LIMITING (Manual with Redis incr + expire)
 *    - Rate limit shared across ALL services and instances
 *    - User can't bypass by calling different services
 *    - Redis key: rate:login:user@email.com checked by all services
 *    - Full control: custom keys, limits, windows, error messages
 *    - Works in both HTTP controllers AND Kafka consumers
 * 
 * 2. DISTRIBUTED CACHING
 *    - User data cached once, used by all services
 *    - Order data accessible across services
 *    - Reduces DB load significantly
 * 
 * 3. DISTRIBUTED LOCKING
 *    - Prevent duplicate operations across services
 *    - Lock key in Redis checked by all instances
 * 
 * 4. EVENT-DRIVEN WITH KAFKA
 *    - Services communicate via events
 *    - Loosely coupled architecture
 *    - Scalable and maintainable
 * 
 * 5. DEBOUNCE/THROTTLE
 *    - Prevent notification spam
 *    - Control API call frequency
 *    - Improve user experience
 */

// ============================================
// ARCHITECTURE DIAGRAM:
// ============================================

/**
 * 
 *     ┌─────────────────────────────────────────┐
 *     │           Load Balancer                 │
 *     └─────────────┬───────────────────────────┘
 *                   │
 *     ┌─────────────┴───────────────────────────┐
 *     │                                         │
 *     ▼                                         ▼
 * ┌───────────┐                           ┌───────────┐
 * │Service A-1│                           │Service A-2│
 * │  (Auth)   │                           │  (Auth)   │
 * └─────┬─────┘                           └─────┬─────┘
 *       │                                       │
 *       │  ┌─────────────────────────────────┐ │
 *       └──┤     Redis (Shared State)       ├─┘
 *       ┌──┤  - Cache                       ├─┐
 *       │  │  - Rate Limits                 │ │
 *       │  │  - Locks                       │ │
 *       │  │  - Sessions                    │ │
 *       │  └─────────────────────────────────┘ │
 *       │                                       │
 *       ▼                                       ▼
 * ┌───────────┐       Kafka Topics       ┌───────────┐
 * │Service B  ├──────────────────────────┤Service C  │
 * │  (Order)  │  user.*, order.*, etc    │  (Notify) │
 * └───────────┘                           └───────────┘
 * 
 */

