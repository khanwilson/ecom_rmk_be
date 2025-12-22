# E-Commerce Remake Backend

A NestJS backend application with MongoDB (Prisma) for e-commerce platform.

## 📋 Prerequisites

- Docker & Docker Compose
- Git

## 🚀 Quick Start with Docker

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ecom_rmk_be
```

### 2. Setup environment variables

```bash
cp .env.example .env
```

Edit `.env` file and configure your environment variables if needed (default values work for development).

### 3. Start the application

```bash
docker-compose -f docker-compose.dev.yml up --build -d
```

This command will:
- Build the Docker images
- Start MongoDB container
- Start Kafka container (KRaft mode - no Zookeeper needed)
- Start NestJS hybrid application (HTTP + Kafka microservice) with hot-reload enabled
- Run Prisma generate automatically

### 4. Sync Prisma schema with database (if schema changed)

After containers are running, sync your Prisma schema:

```bash
docker-compose -f docker-compose.dev.yml exec nestjs-app npx prisma db push && npx prisma generate
```

### 5. Access the application

- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health
- **Kafka Broker**: kafka:9092 (from containers) / localhost:9092 (from host)
- **Kafka Health**: http://localhost:3000/kafka/health

## 🏗️ Local Development (without Docker)

If you prefer to run locally without Docker:

### 1. Install dependencies

```bash
yarn install
```

### 2. Setup environment

```bash
cp .env.example .env
```

Update `DATABASE_URL` in `.env` to point to your local MongoDB instance.

### 3. Sync database

```bash
npx prisma db push
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Run the application

```bash
# development with watch mode
yarn start:dev

# production mode
yarn start:prod
```

## 📦 Production Deployment

### Using Docker (Recommended)

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

**Important:** For production, configure your `.env` file with:
- MongoDB Atlas connection string
- Production PORT
- Other production environment variables

Example production DATABASE_URL:
```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

## 📚 Technologies

- **Framework**: NestJS with Microservices
- **Database**: MongoDB with Prisma ORM
- **Message Broker**: Apache Kafka 3.7+ (KRaft mode - no Zookeeper)
- **Kafka Client**: NestJS Microservices with KafkaJS
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer
- **Runtime**: Node.js 24 (Alpine)

## 📝 Common Issues

### Container fails to start

1. Check if ports are already in use:
```bash
lsof -i :3000
lsof -i :27017
```

2. Remove old containers and volumes:
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build -d
```

### Prisma schema changes not reflecting

Run db push and generate after modifying `prisma/schema.prisma`:
```bash
docker-compose -f docker-compose.dev.yml exec nestjs-app npx prisma db push && npx prisma generate
```

### Hot reload not working

Make sure your `src/` directory is properly mounted. Check `docker-compose.dev.yml` volumes configuration.

### Kafka connection issues

1. Check if Kafka is running:
```bash
docker-compose -f docker-compose.dev.yml ps kafka
```

2. View Kafka logs:
```bash
docker-compose -f docker-compose.dev.yml logs -f kafka
```

3. Restart Kafka service:
```bash
docker-compose -f docker-compose.dev.yml restart kafka
```

Note: This setup uses Kafka 3.7+ with KRaft mode (no Zookeeper required).

## 🚀 Using Kafka (NestJS Microservices Pattern)

### Send a test event

```bash
curl -X POST http://localhost:3000/kafka/send \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "order.created",
    "message": {"orderId": "123", "total": 99.99}
  }'
```

### Producer: Send events from your code

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class OrderService {
  constructor(
    @Inject('KAFKA_CLIENT') private kafkaClient: ClientKafka,
  ) {}

  async createOrder(orderData: any) {
    // Save to database
    const order = await this.saveOrder(orderData);
    
    // Emit event to Kafka
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

### Consumer: Handle events with decorators

```typescript
import { Injectable } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';

@Injectable()
export class NotificationService {
  
  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: any, @Ctx() context: KafkaContext) {
    console.log('New order received:', data);
    
    // Send email notification
    await this.sendOrderConfirmation(data);
  }

  @EventPattern('user.registered')
  async handleUserRegistered(@Payload() data: any) {
    console.log('New user:', data);
    await this.sendWelcomeEmail(data);
  }
}
```

### Setup: Inject Kafka Client in your module

```typescript
import { Module } from '@nestjs/common';
import { KafkaClientModule } from './kafka/kafka-client.module';
import { OrderService } from './order.service';

@Module({
  imports: [KafkaClientModule],
  providers: [OrderService],
})
export class OrderModule {}
```

## 📄 License

This project is [MIT licensed](LICENSE).
