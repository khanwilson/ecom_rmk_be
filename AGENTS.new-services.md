# AGENTS - New Service Creation Guide

This document provides a standardized process for creating new microservices in the e-commerce system. Follow this guide to ensure consistency across all services.

---

## Quick Reference

| Step | Description | Status Template |
|------|-------------|-----------------|
| Part 1 | Create service framework | ⏳ Pending |
| Part 2 | Create APIs | ⏳ Pending |
| Part 3 | Inter-service connections | ⏳ Pending |
| Part 4 | Additional items | ⏳ Pending |

---

## Part 1: Create Service Framework

### Prerequisites
- [ ] Service defined in `site-map.md` with collections and schema
- [ ] Environment variables added to `.env` file:
  - `<SERVICE_NAME>_PORT` (e.g., `SHOP_PORT=3004`)
  - `DATABASE_URL_<SERVICE_NAME>` (e.g., `DATABASE_URL_SHOP`)

### Checklist

#### 1.1 Directory Structure
```
<service-name>/
├── src/
│   ├── main.ts
│   ├── <service-name>.module.ts
│   ├── <service-name>.service.ts
│   └── <service-name>.controller.ts
├── prisma/
│   ├── schema.prisma
│   ├── prisma.ts
│   └── prisma.config.ts
├── kafka/
│   ├── kafka.controller.ts
│   └── kafka.service.ts
├── modules/
│   └── <feature>/
│       └── dto/
├── generated/
│   └── prisma/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── Dockerfile.dev
├── docker-entrypoint.sh
├── eslint.config.mjs
├── .dockerignore
├── .gitignore
├── .prettierrc
└── README.md
```

#### 1.2 Files Checklist

| File | Description | Status |
|------|-------------|--------|
| `prisma/schema.prisma` | Prisma schema based on site-map.md | ⬜ |
| `package.json` | Dependencies and scripts | ⬜ |
| `tsconfig.json` | TypeScript config with path aliases | ⬜ |
| `tsconfig.build.json` | Build config | ⬜ |
| `nest-cli.json` | NestJS CLI config | ⬜ |
| `Dockerfile.dev` | Development Docker image | ⬜ |
| `docker-entrypoint.sh` | Container entrypoint script | ⬜ |
| `eslint.config.mjs` | ESLint configuration | ⬜ |
| `.dockerignore` | Docker ignore patterns | ⬜ |
| `.gitignore` | Git ignore patterns | ⬜ |
| `.prettierrc` | Prettier configuration | ⬜ |
| `prisma/prisma.ts` | Prisma client export | ⬜ |
| `prisma/prisma.config.ts` | Prisma config with datasource | ⬜ |
| `src/main.ts` | Application bootstrap | ⬜ |
| `src/<name>.module.ts` | Root module | ⬜ |
| `src/<name>.service.ts` | Main service (placeholder) | ⬜ |
| `src/<name>.controller.ts` | Main controller (placeholder) | ⬜ |
| `kafka/kafka.controller.ts` | Kafka event handlers | ⬜ |
| `kafka/kafka.service.ts` | Kafka business logic | ⬜ |

#### 1.3 Shared Libraries Updates

| Item | Description | Status |
|------|-------------|--------|
| `libs/kafka/constant/kafka.enum.ts` | Add `<NAME>_SERVICE` to `KAFKA_SERVICES` enum | ⬜ |

#### 1.4 Infrastructure Updates

| Item | Description | Status |
|------|-------------|--------|
| `docker-compose.dev.yml` | Add service definition | ⬜ |
| `package.json` (root) | Update scripts to include new service | ⬜ |

---

## Part 2: Create APIs

### 2.1 API Planning

List all APIs to be implemented:

| # | Method | Endpoint | Description | Auth Required | Status |
|---|--------|----------|-------------|---------------|--------|
| 1 | GET | `/example` | Example endpoint | ⬜ No / ✅ Yes | ⬜ |

### 2.2 DTOs

Create DTOs in `modules/<feature>/dto/`:

| DTO File | Description | Status |
|----------|-------------|--------|
| `create-<entity>.dto.ts` | Create entity DTO | ⬜ |
| `update-<entity>.dto.ts` | Update entity DTO | ⬜ |

### 2.3 Service Methods

Implement service methods in `src/<service-name>.service.ts`:

| Method | Description | Status |
|--------|-------------|--------|
| `create<Entity>()` | Create new entity | ⬜ |
| `update<Entity>()` | Update entity | ⬜ |
| `delete<Entity>()` | Delete entity | ⬜ |
| `get<Entity>()` | Get single entity | ⬜ |
| `list<Entities>()` | List entities | ⬜ |

### 2.4 Controller Endpoints

Implement endpoints in `src/<service-name>.controller.ts`:

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/` | GET | Health check | ⬜ |

---

## Part 3: Inter-Service Connections

### 3.1 Redis Integration

| Feature | Description | Status |
|---------|-------------|--------|
| Caching | Cache frequently accessed data | ⬜ |
| Pub/Sub | Real-time notifications | ⬜ |

### 3.2 Kafka Integration

| Topic | Event Type | Producer/Consumer | Description | Status |
|-------|------------|-------------------|-------------|--------|
| `ecom.<service>.<action>` | Event | Producer | Emit event | ⬜ |

### 3.3 Service Dependencies

| Dependency | How to Communicate | Purpose | Status |
|------------|-------------------|---------|--------|
| Identity Service | Kafka/HTTP | User verification | ⬜ |

---

## Part 4: Additional Items

### 4.1 Libs Updates

| File | Change Description | Status |
|------|-------------------|--------|
| `libs/kafka/constant/kafka.enum.ts` | Add new topics | ⬜ |

### 4.2 Custom Configurations

| Item | Description | Status |
|------|-------------|--------|
| N/A | No custom configs needed | ⬜ |

---

## Change Log

| Date | Author | Change Description |
|------|--------|-------------------|
| YYYY-MM-DD | Name | Initial creation |

---

## Template Usage

### How to Use This Template

1. **Copy this template** for each new service
2. **Replace placeholders**:
   - `<service-name>` → actual service name (e.g., `shop`)
   - `<SERVICE_NAME>` → uppercase service name (e.g., `SHOP`)
   - `<name>` → short name (e.g., `shop`)
   - `<NAME>` → uppercase short name (e.g., `SHOP`)
   - `<entity>` → entity name (e.g., `category`)
   - `<Entity>` → PascalCase entity name (e.g., `Category`)

3. **Update status**:
   - ⬜ = Not started
   - 🔄 = In progress
   - ✅ = Completed
   - ❌ = Cancelled/Not needed

4. **Log all changes** in the Change Log section

---

## File Templates

### package.json Template
```json
{
  "name": "<service-name>",
  "version": "0.0.1",
  "private": true,
  "type": "commonjs",
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "clean-cache": "rm -rf node_modules && rm -rf bun.lock && bun install --force"
  },
  "dependencies": {
    "@ecom-rmk/libs": "file:../libs/ecom-rmk-libs-1.0.0.tgz",
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.2",
    "@nestjs/core": "^11.0.1",
    "@nestjs/jwt": "^11.0.2",
    "@nestjs/microservices": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/swagger": "^8.1.1",
    "@prisma/client": "6.19",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "dotenv": "^17.2.3",
    "kafkajs": "^2.2.4",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  }
}
```

### docker-compose.dev.yml Service Template
```yaml
<service-name>-service:
  build:
    context: .
    dockerfile: ./<service-name>/Dockerfile.dev
  container_name: <service-name>-service
  env_file:
    - ./.env
  ports:
    - "${<SERVICE_NAME>_PORT}:${<SERVICE_NAME>_PORT}"
  depends_on:
    kafka:
      condition: service_healthy
    libs-builder:
      condition: service_started
    redis-node-1:
      condition: service_healthy
    redis-cluster-init:
      condition: service_started
    mongodb-primary:
      condition: service_healthy
    mongodb-replica-init:
      condition: service_completed_successfully
  volumes:
    - ./libs:/usr/src/libs
    - ./<service-name>/src:/usr/src/<service-name>/src
    - ./<service-name>/kafka:/usr/src/<service-name>/kafka
    - ./<service-name>/prisma:/usr/src/<service-name>/prisma
    - ./<service-name>/modules:/usr/src/<service-name>/modules
    - <service-name>_node_modules:/usr/src/<service-name>/node_modules
  networks:
    - ecom-network

# Add to volumes section:
<service-name>_node_modules:
```

### prisma.config.ts Template
```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'schema.prisma',
  migrations: {
    path: 'migrations',
  },
  engine: 'classic',
  datasource: {
    url: env('DATABASE_URL_<SERVICE_NAME>'),
  },
});
```

### main.ts Template
```typescript
import { HttpExceptionInterceptor } from '@ecom-rmk/libs/common';
import { retryConnect } from '@ecom-rmk/libs/utils';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { <Name>Module } from './<name>.module';

async function bootstrap() {
  const app = await NestFactory.create(<Name>Module);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.useGlobalInterceptors(new HttpExceptionInterceptor());

  const config = new DocumentBuilder()
    .setTitle('<Name> Service API')
    .setDescription('<Name> Service API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'accessToken'
    )
    .addTag('<name>', '<Name> management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const kafkaBroker = configService.get<string>('KAFKA_BROKER', 'kafka:9092');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: '<name>-service',
        brokers: [kafkaBroker],
      },
      consumer: {
        groupId: '<name>-service-consumer',
      },
    },
  });

  await retryConnect('Kafka microservice (ServerKafka)', app.startAllMicroservices);

  const port = parseInt(configService.get<string>('<SERVICE_NAME>_PORT', '300X'), 10) || 300X;
  await app.listen(port);
  console.log(`✅ <Name> service running on: http://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/api`);
}

bootstrap();
```

---

## Notes

- Always follow `AGENTS.md` guidelines
- Use `bun` for all package management
- Use absolute imports as defined in `tsconfig.json`
- All code comments must be in English
