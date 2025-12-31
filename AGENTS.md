# AGENTS - Project Context & Standards

## Communication Standards

- **Language**: Respond in the same language as the user's query
- **Code Comments**: All code comments and notes must be in English only
- **Package Manager**: Prefer yarn over npm for all commands when possible

## Project Architecture

### Technology Stack
- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: MongoDB
- **Containerization**: Docker

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
- **Issue**: Yarn cache distinguishes `.tgz` packages by name, not version
- **Impact**: Changes to `libs/` may not be reflected if cache is not cleared
- **Solution**: Each service's `docker-entrypoint.sh` must:
  - Delete `node_modules`
  - Clean yarn cache
  - Reinstall dependencies when `package.json` or `package.lock` changes

### Content Guidelines
- Contains shared variables and helper functions
- Should be rarely modified (write once, use many)
- Ensures consistency across microservices
- Used for synchronization between services

## Development Workflow

### When `libs/` Changes
1. Update `libs/` code
2. Rebuild and repackage as `.tgz`
3. Update service `package.json` if needed
4. Ensure `docker-entrypoint.sh` handles cache clearing and reinstallation

## Environment Variables

### Important Note on Type Handling
- **All environment variables are strings by default**: Functions that read from `.env` files (`configService.get()`, `process.env`, etc.) return **string** type, not number, boolean, or other types
- **Type casting is required**: When using numeric or boolean values from environment variables, always parse them explicitly:
  - For numbers: Use `parseInt(value, 10)` or `parseFloat(value)`
  - For booleans: Use `value === 'true'` or similar comparison
  - Example: `const saltRounds = parseInt(configService.get<string>('BCRYPT_SALT_ROUNDS', '12'), 10) || 12;`
- **TypeScript generics don't auto-convert**: `configService.get<number>()` does NOT automatically convert string to number - it only provides type hinting

