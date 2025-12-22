/**
 * Example: Order Events with Kafka
 * 
 * This file demonstrates how to use Kafka in a real-world scenario
 * for order management with event-driven architecture.
 */

import { Injectable, Inject } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { ClientKafka } from '@nestjs/microservices';

// ============================================
// 1. ORDER SERVICE (Producer)
// ============================================

interface CreateOrderDto {
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  shippingAddress: string;
}

@Injectable()
export class OrderService {
  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    // private readonly orderRepository: OrderRepository,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    // 1. Save order to database
    const order = {
      id: Math.random().toString(36).substring(7),
      ...dto,
      status: 'PENDING',
      total: dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      createdAt: new Date(),
    };
    
    // await this.orderRepository.save(order);
    
    // 2. Emit event to Kafka
    this.kafkaClient.emit('order.created', {
      orderId: order.id,
      userId: order.userId,
      total: order.total,
      items: order.items,
      timestamp: order.createdAt.toISOString(),
    });
    
    console.log(`✅ Order ${order.id} created and event emitted`);
    return order;
  }

  async updateOrderStatus(orderId: string, status: string) {
    // Update in database
    // await this.orderRepository.update(orderId, { status });
    
    // Emit status change event
    this.kafkaClient.emit('order.status.changed', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
    
    console.log(`✅ Order ${orderId} status updated to ${status}`);
  }
}

// ============================================
// 2. NOTIFICATION SERVICE (Consumer)
// ============================================

@Injectable()
export class NotificationConsumer {
  
  @EventPattern('order.created')
  async sendOrderConfirmation(@Payload() data: any, @Ctx() context: KafkaContext) {
    const { offset, attributes } = context.getMessage();
    
    console.log(`📧 [Notification] Processing order.created`);
    console.log(`   Offset: ${offset}, attributes: ${attributes}`);
    console.log(`   Order ID: ${data.orderId}`);
    
    // Send confirmation email
    await this.sendEmail({
      to: data.userId,
      subject: 'Order Confirmation',
      body: `Your order ${data.orderId} has been confirmed. Total: $${data.total}`,
    });
    
    // Send SMS notification
    await this.sendSMS({
      to: data.userId,
      message: `Order ${data.orderId} confirmed!`,
    });
  }

  @EventPattern('order.status.changed')
  async notifyStatusChange(@Payload() data: any) {
    console.log(`📧 [Notification] Order ${data.orderId} status: ${data.status}`);
    
    if (data.status === 'SHIPPED') {
      await this.sendEmail({
        to: data.userId,
        subject: 'Your order has been shipped!',
        body: `Track your order ${data.orderId}`,
      });
    }
  }

  private async sendEmail(params: any) {
    // Email sending logic
    console.log(`   📤 Email sent:`, params.subject);
  }

  private async sendSMS(params: any) {
    // SMS sending logic
    console.log(`   📱 SMS sent:`, params.message);
  }
}

// ============================================
// 3. INVENTORY SERVICE (Consumer)
// ============================================

@Injectable()
export class InventoryConsumer {
  
  @EventPattern('order.created')
  async updateInventory(@Payload() data: any) {
    console.log(`📦 [Inventory] Processing order ${data.orderId}`);
    
    // Update stock for each item
    for (const item of data.items) {
      await this.decreaseStock(item.productId, item.quantity);
    }
    
    console.log(`   ✅ Inventory updated for ${data.items.length} items`);
  }

  @EventPattern('order.status.changed')
  async handleCancellation(@Payload() data: any) {
    if (data.status === 'CANCELLED') {
      console.log(`📦 [Inventory] Restoring stock for cancelled order ${data.orderId}`);
      // Restore inventory
      await this.restoreStock(data.orderId);
    }
  }

  private async decreaseStock(productId: string, quantity: number) {
    console.log(`   - Decreasing stock for ${productId}: -${quantity}`);
    // Database update logic
  }

  private async restoreStock(orderId: string) {
    console.log(`   + Restoring stock for order ${orderId}`);
    // Database update logic
  }
}

// ============================================
// 4. ANALYTICS SERVICE (Consumer)
// ============================================

@Injectable()
export class AnalyticsConsumer {
  
  @EventPattern('order.created')
  async trackOrderCreated(@Payload() data: any) {
    console.log(`📊 [Analytics] Recording order creation`);
    
    // Track metrics
    await this.recordMetric('order_created', {
      orderId: data.orderId,
      total: data.total,
      itemCount: data.items.length,
      timestamp: data.timestamp,
    });
  }

  @EventPattern('order.status.changed')
  async trackStatusChange(@Payload() data: any) {
    console.log(`📊 [Analytics] Recording status change: ${data.status}`);
    
    await this.recordMetric('order_status_changed', {
      orderId: data.orderId,
      status: data.status,
      timestamp: data.timestamp,
    });
  }

  private async recordMetric(eventName: string, data: any) {
    console.log(`   📈 Metric recorded: ${eventName}`);
    // Send to analytics platform (Google Analytics, Mixpanel, etc.)
  }
}

// ============================================
// 5. MODULE SETUP
// ============================================

/**
 * Example module configuration:
 * 
 * @Module({
 *   imports: [KafkaClientModule],
 *   providers: [
 *     OrderService,
 *     NotificationConsumer,
 *     InventoryConsumer,
 *     AnalyticsConsumer,
 *   ],
 *   controllers: [OrderController],
 * })
 * export class OrderModule {}
 */

// ============================================
// 6. CONTROLLER (HTTP Endpoint)
// ============================================

/**
 * @Controller('orders')
 * export class OrderController {
 *   constructor(private readonly orderService: OrderService) {}
 * 
 *   @Post()
 *   async create(@Body() dto: CreateOrderDto) {
 *     return this.orderService.createOrder(dto);
 *   }
 * 
 *   @Patch(':id/status')
 *   async updateStatus(
 *     @Param('id') id: string,
 *     @Body() body: { status: string },
 *   ) {
 *     return this.orderService.updateOrderStatus(id, body.status);
 *   }
 * }
 */

