# Kafka Module (NestJS Microservices)

This module provides Kafka integration using NestJS Microservices pattern with decorator-based event handling.

## Configuration

Kafka configuration is managed through environment variables:

```env
KAFKA_BROKER=kafka:9092  # Default for Docker
# or
KAFKA_BROKER=localhost:9093  # For local development
```

## Architecture

This setup uses NestJS Hybrid Application pattern:
- **HTTP Server**: Handles REST API requests
- **Kafka Microservice**: Handles Kafka messages with `@EventPattern` decorators
- **Both run in the same process** for easier development and deployment

## Usage Examples

### 1. Producer: Send Events (Inject ClientKafka)

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class OrderService {
  constructor(
    @Inject('KAFKA_CLIENT') private kafkaClient: ClientKafka,
  ) {}

  async createOrder(orderData: any) {
    // Save to database
    const order = await this.orderRepository.save(orderData);
    
    // Emit event to Kafka (fire and forget)
    this.kafkaClient.emit('order.created', {
      orderId: order.id,
      userId: order.userId,
      total: order.total,
      timestamp: Date.now(),
    });
    
    return order;
  }
}
```

### 2. Consumer: Handle Events (Use @EventPattern Decorator)

```typescript
import { Injectable } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';

@Injectable()
export class OrderConsumerService {
  
  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: any, @Ctx() context: KafkaContext) {
    const { topic, partition, offset } = context.getMessage();
    console.log(`Received from ${topic}:${partition}@${offset}`);
    console.log('Order data:', data);
    
    // Process the order
    await this.sendNotification(data);
    await this.updateInventory(data);
  }

  @EventPattern('order.updated')
  async handleOrderUpdated(@Payload() data: any) {
    console.log('Order updated:', data);
    // Handle update logic
  }

  private async sendNotification(orderData: any) {
    // Send email/SMS notification
  }

  private async updateInventory(orderData: any) {
    // Update product inventory
  }
}
```

### 3. Setup: Import KafkaClientModule in Your Module

```typescript
import { Module } from '@nestjs/common';
import { KafkaClientModule } from './kafka/kafka-client.module';
import { OrderService } from './order.service';
import { OrderConsumerService } from './order-consumer.service';

@Module({
  imports: [KafkaClientModule], // Import to use KAFKA_CLIENT
  providers: [OrderService, OrderConsumerService],
})
export class OrderModule {}
```

## API Endpoints

### Test Kafka Connection

```bash
GET /kafka/health
```

Response:
```json
{
  "status": "ok",
  "kafka": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Send Test Message

```bash
POST /kafka/send
Content-Type: application/json

{
  "topic": "test-topic",
  "message": {
    "data": "Hello Kafka!",
    "timestamp": 1234567890
  }
}
```

Response:
```json
{
  "success": true,
  "message": "Message sent to topic: test-topic"
}
```

## Common Patterns

### Event-Driven Architecture with NestJS

```typescript
// 1. Producer: Emit events when actions happen
@Injectable()
export class OrderService {
  constructor(@Inject('KAFKA_CLIENT') private kafka: ClientKafka) {}

  async createOrder(data: CreateOrderDto) {
    const order = await this.orderRepo.save(data);
    
    // Emit event
    this.kafka.emit('order.created', {
      orderId: order.id,
      amount: order.total,
    });
    
    return order;
  }
}

// 2. Consumer: React to events with decorators
@Injectable()
export class NotificationService {
  
  @EventPattern('order.created')
  async onOrderCreated(@Payload() data: any) {
    await this.emailService.sendOrderConfirmation(data);
  }
}

// 3. Multiple consumers for the same event
@Injectable()
export class InventoryService {
  
  @EventPattern('order.created')
  async onOrderCreated(@Payload() data: any) {
    await this.updateStock(data);
  }
}
```

## Docker Setup

Kafka runs in **KRaft mode** (no Zookeeper needed):

- **Kafka**: Port 9092
- **Image**: `apache/kafka:3.7.0`
- **Mode**: KRaft (Kafka Raft metadata mode)

From your host machine, use: `localhost:9092`
From containers, use: `kafka:9092`

## Troubleshooting

### Connection timeout

Make sure Kafka container is running:
```bash
docker-compose -f docker-compose.dev.yml ps kafka
```

### Messages not being consumed

1. Check consumer group status
2. Verify topic exists
3. Check consumer logs

### Performance tuning

For production, consider:
- Increase number of partitions
- Configure replication factor > 1
- Tune batch size and linger.ms
- Monitor consumer lag

