# AGENTS - Project Context & Standards

## Communication Standards

- **Language**: Respond in the same language as the user's query
- **Code Comments**: All code comments and notes must be in English only
- **Package Manager**: **MUST use Bun** for all package management and script execution
  - Use `bun` instead of `npm`, `yarn`, or `pnpm`
  - Use `bunx` instead of `npx` for running packages (e.g., `bunx prisma generate`)
  - Examples:
    - ✅ Good: `bun install`, `bun run build`, `bunx prisma db push`
    - ❌ Bad: `npm install`, `yarn install`, `npx prisma generate`

## Import Standards

### Use Absolute Imports
- **Always prefer absolute imports over relative imports**: Use path aliases defined in `tsconfig.json` instead of relative paths like `../` or `../../`
- **Available path aliases** (configured in `tsconfig.json`):
  - `modules/*` - For importing from modules directory
  - `prisma/*` - For importing from prisma directory
  - `generated/*` - For importing from generated directory
- **Examples**:
  - ✅ Good: `import { AuthModule } from 'modules/auth/auth.module';`
  - ❌ Bad: `import { AuthModule } from '../modules/auth/auth.module';`
  - ✅ Good: `import { prisma } from 'prisma/prisma';`
  - ❌ Bad: `import { prisma } from '../../prisma/prisma';`
- **Benefits**: Cleaner code, easier refactoring, no path confusion when moving files

## Kafka Directory Structure

### Purpose
- **`kafka/` directory**: Contains Kafka event consumers and handlers for inter-service communication
- **Location**: Each microservice has its own `kafka/` directory at the root level (e.g., `identity/kafka/`, `product/kafka/`)

### Rules
- **Only EventPattern/MessagePattern**: This directory is exclusively for creating Kafka consumers using `@EventPattern()` and `@MessagePattern()` decorators
- **No REST API Controllers**: Do NOT write REST API endpoints (like `@Get()`, `@Post()`, etc.) in this directory
- **No Module Export**: This directory does NOT export a module to be imported into the main service module
- **Direct Registration**: Controllers and services in `kafka/` are registered directly in the main service module (e.g., `IdentityModule`, `ProductModule`)

### Structure
- **`kafka/kafka.controller.ts`**: Contains Kafka event handlers with `@EventPattern()` or `@MessagePattern()` decorators
- **`kafka/kafka.service.ts`**: Contains business logic for processing Kafka events
- **`kafka/dto/`**: Contains DTOs specific to Kafka event payloads (optional)

### Examples
- ✅ Good: `@EventPattern(KAFKA_TOPICS.IDENTITY_MESSAGE)` - Kafka event consumer
- ✅ Good: `@MessagePattern(KAFKA_TOPICS.PRODUCT_MESSAGE)` - Kafka message consumer
- ❌ Bad: `@Get('kafka/status')` - REST API endpoint (should be in `modules/` or `src/`)
- ❌ Bad: Exporting `KafkaModule` - This directory doesn't export modules

## Project Architecture

### Technology Stack
- **Framework**: NestJS
- **Package Manager**: Bun (replaces npm/yarn)
- **Runtime**: Bun (can also use Node.js)
- **ORM**: Prisma
- **Database**: MongoDB
- **Containerization**: Docker (using official `oven/bun` image)

### System Architecture
- **Type**: Super app, multi microservices architecture
- **Service Independence**: Each microservice operates independently with:
  - Own Prisma schema
  - Own database instance
- **Inter-Service Communication**:
  - Redis: For caching and pub/sub
  - Kafka: For event-driven communication

### Data Consistency & Integrity

#### Within Database (Atomicity)
- **Replica Set**: Used for atomic operations within a single database
- Ensures data integrity and error handling under high load

#### Between Microservices (Consistency)
- **Saga Pattern**: Ensures consistency across different microservices and their databases
- Coordinates distributed transactions across service boundaries

## Shared Infrastructure (`libs/`)

### Overview
- `libs/` contains shared infrastructure components
- Packaged as `.tgz` file for distribution to microservices
- Installed via `package.json` in each microservice

### Cache Limitation
- **Issue**: Bun cache distinguishes `.tgz` packages by name, not version
- **Impact**: Changes to `libs/` may not be reflected if cache is not cleared
- **Solution**: Each service's `docker-entrypoint.sh` must:
  - Delete `node_modules` and `bun.lock` to force fresh install
  - Use `bun install --force` to force reinstall all packages (similar to `yarn install --force`)
  - Reinstall dependencies when `package.json` or `bun.lock` changes

### Content Guidelines
- Contains shared variables and helper functions
- Should be rarely modified (write once, use many)
- Ensures consistency across microservices
- Used for synchronization between services

## Development Workflow

### When `libs/` Changes
1. Update `libs/` code
2. Rebuild using `bun run build` and repackage as `.tgz` using `bun pm pack`
3. Update service `package.json` if needed
4. Ensure `docker-entrypoint.sh` handles cache clearing and reinstallation using `bun install --force`

## Environment Variables

### Important Note on Type Handling
- **All environment variables are strings by default**: Functions that read from `.env` files (`configService.get()`, `process.env`, etc.) return **string** type, not number, boolean, or other types
- **Type casting is required**: When using numeric or boolean values from environment variables, always parse them explicitly:
  - For numbers: Use `parseInt(value, 10)` or `parseFloat(value)`
  - For booleans: Use `value === 'true'` or similar comparison
  - Example: `const saltRounds = parseInt(configService.get<string>('BCRYPT_SALT_ROUNDS', '12'), 10) || 12;`
- **TypeScript generics don't auto-convert**: `configService.get<number>()` does NOT automatically convert string to number - it only provides type hinting

