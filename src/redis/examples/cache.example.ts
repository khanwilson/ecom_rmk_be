/**
 * Redis Cache Examples - Pure ioredis
 * Demonstrates how to use ioredis for caching in NestJS microservices
 */

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

// ============================================
// Example 1: Basic Cache Management
// ============================================

@Injectable()
export class UserService {
  constructor(private readonly redisService: RedisService) {}

  async getUserById(userId: string) {
    const cacheKey = `user:${userId}`;
    
    // Try to get from cache first
    const cachedUser = await this.redisService.get(cacheKey);
    if (cachedUser) {
      console.log('✅ Cache HIT:', cacheKey);
      return cachedUser;
    }
    
    console.log('❌ Cache MISS:', cacheKey);
    
    // Fetch from database
    const user = await this.fetchUserFromDB(userId);
    
    // Store in cache for 5 minutes
    await this.redisService.set(cacheKey, user, 300);
    
    return user;
  }

  async fetchUserFromDB(userId: string) {
    // Simulate database query
    return {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
    };
  }

  async updateUser(userId: string, data: any) {
    // Update database
    const updated = await this.saveToDatabase(userId, data);
    
    // Invalidate cache
    await this.redisService.del(`user:${userId}`);
    
    return updated;
  }

  private async saveToDatabase(userId: string, data: any) {
    // Database update logic
    return { id: userId, ...data };
  }
}

// ============================================
// Example 2: Product Caching with getOrSet
// ============================================

@Injectable()
export class ProductService {
  constructor(private readonly redisService: RedisService) {}
  
  async getAllProducts() {
    return this.redisService.getOrSet(
      'products:all',
      async () => {
        console.log('Fetching products from database...');
        // Simulate slow database query
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        return [
          { id: 1, name: 'Product 1', price: 100 },
          { id: 2, name: 'Product 2', price: 200 },
        ];
      },
      300, // Cache for 5 minutes
    );
  }

  async getProductById(id: string) {
    const cacheKey = `product:${id}`;
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        console.log(`Fetching product ${id} from database...`);
        return { id, name: `Product ${id}`, price: 100 };
      },
      60, // Cache for 1 minute
    );
  }

  async updateProduct(id: string, data: any) {
    // Update database
    const updated = await this.saveToDatabase(id, data);
    
    // Invalidate cache
    await this.redisService.del(`product:${id}`);
    await this.redisService.del('products:all'); // Invalidate list cache too
    
    return updated;
  }

  private async saveToDatabase(id: string, data: any) {
    return { id, ...data };
  }
}

// ============================================
// Example 3: Cache-Aside Pattern with Manual Control
// ============================================

@Injectable()
export class OrderService {
  constructor(private readonly redisService: RedisService) {}

  async getOrderStats(userId: string) {
    const cacheKey = `order:stats:${userId}`;
    
    // Use getOrSet helper
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        // This runs only on cache miss
        console.log('Calculating order stats...');
        return {
          totalOrders: 42,
          totalSpent: 1234.56,
          lastOrderDate: new Date(),
        };
      },
      600, // Cache for 10 minutes
    );
  }
}

// ============================================
// Example 4: Session Storage
// ============================================

@Injectable()
export class SessionService {
  constructor(private readonly redisService: RedisService) {}

  async createSession(userId: string, data: any) {
    const sessionId = this.generateSessionId();
    const sessionKey = `session:${sessionId}`;
    
    await this.redisService.set(
      sessionKey,
      { userId, ...data, createdAt: Date.now() },
      3600, // 1 hour
    );
    
    return sessionId;
  }

  async getSession(sessionId: string) {
    const sessionKey = `session:${sessionId}`;
    return this.redisService.get(sessionKey);
  }

  async deleteSession(sessionId: string) {
    const sessionKey = `session:${sessionId}`;
    await this.redisService.del(sessionKey);
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(7);
  }
}

// ============================================
// Example 5: Distributed Rate Limiting (Using built-in method)
// ============================================

@Injectable()
export class ApiService {
  constructor(private readonly redisService: RedisService) {}

  async handleApiCall(userId: string) {
    // Check rate limit (distributed across all services)
    const result = await this.redisService.checkRateLimit(
      `api:${userId}`,
      10,  // 10 requests
      60,  // per 60 seconds
    );

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`);
    }

    console.log(`Remaining: ${result.remaining}, Reset at: ${new Date(result.resetAt)}`);
    
    // Process API call
    return 'API response';
  }
}

// ============================================
// Example 6: Debounce Pattern
// ============================================

@Injectable()
export class EmailService {
  constructor(private readonly redisService: RedisService) {}

  async sendWelcomeEmail(userId: string) {
    const debounceKey = `email:welcome:${userId}`;
    
    // Only send if not sent in last 5 minutes
    const allowed = await this.redisService.debounce(debounceKey, 300);
    
    if (!allowed) {
      console.log('Email already sent recently, skipping');
      return { sent: false, reason: 'debounced' };
    }

    // Send email
    console.log(`Sending welcome email to user ${userId}`);
    return { sent: true };
  }
}

// ============================================
// Example 7: Distributed Lock
// ============================================

@Injectable()
export class PaymentService {
  constructor(private readonly redisService: RedisService) {}

  async processPayment(orderId: string) {
    const lockKey = `lock:payment:${orderId}`;
    
    // Check if another service is processing this payment
    const hasLock = await this.redisService.exists(lockKey);
    if (hasLock) {
      throw new Error('Payment already being processed by another service');
    }

    // Acquire lock
    await this.redisService.set(lockKey, 'locked', 30);
    
    try {
      // Process payment (safe from duplicates)
      console.log(`Processing payment for order ${orderId}`);
      await this.chargeCustomer(orderId);
      
      return { success: true };
    } finally {
      // Always release lock
      await this.redisService.del(lockKey);
    }
  }

  private async chargeCustomer(orderId: string) {
    // Payment logic
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// ============================================
// Example 8: Counters and Analytics
// ============================================

@Injectable()
export class AnalyticsService {
  constructor(private readonly redisService: RedisService) {}

  async trackPageView(page: string) {
    const key = `analytics:views:${page}`;
    const views = await this.redisService.incr(key);
    
    // Set TTL on first increment
    if (views === 1) {
      await this.redisService.expire(key, 86400); // 24 hours
    }
    
    return views;
  }

  async trackPurchase(productId: string, amount: number) {
    const countKey = `analytics:purchases:${productId}`;
    const revenueKey = `analytics:revenue:${productId}`;
    
    await this.redisService.incr(countKey);
    await this.redisService.incrby(revenueKey, amount);
    
    await this.redisService.expire(countKey, 86400);
    await this.redisService.expire(revenueKey, 86400);
  }

  async getStats(productId: string) {
    const [purchases, revenue] = await Promise.all([
      this.redisService.get<number>(`analytics:purchases:${productId}`),
      this.redisService.get<number>(`analytics:revenue:${productId}`),
    ]);

    return {
      purchases: purchases || 0,
      revenue: revenue || 0,
    };
  }
}

