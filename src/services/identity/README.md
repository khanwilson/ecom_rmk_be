# Identity Service

Microservice for user identity management, authentication, and OTP verification.

## Setup

1. **Install Dependencies** (if using standalone package.json):
   ```bash
   cd src/services/identity
   yarn install
   ```

2. **Generate Prisma Client** (required before running):
   ```bash
   # From root
   npm run prisma:generate-identity
   # Or from service directory
   yarn prisma:generate
   ```

3. **Environment Setup**:
   - Copy `env.dev.md` to `.env.dev` for development
   - Copy `env.prod.md` to `.env.prod` for production
   - Ensure root `.env.dev` or `.env.prod` has shared Redis/Kafka/Mongo configs
   - Set `NODE_ENV=dev` or `NODE_ENV=prod` before running
   - ConfigModule will automatically load `.env.${NODE_ENV}` with variable expansion enabled

4. **Run Service** (from root):
   ```bash
   npm run start:service-identity
   ```

   Or from service directory:
   ```bash
   cd src/services/identity
   yarn start:dev
   ```

5. **Run with Docker**:
   ```bash
   # From root
   docker-compose -f docker-compose.dev.yml up identity-service
   ```

## API Endpoints

### Public (no auth required)
- `POST /auth/register` - Register new identity
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Request password reset OTP
- `POST /auth/reset-password` - Reset password with OTP

### Private (Bearer token required)
- `GET /auth/me` - Get current identity
- `POST /auth/logout` - Logout (revoke refresh token)
- `DELETE /auth/me` - Soft delete account
- `POST /otp/send` - Send OTP via email

## Swagger

Access Swagger UI at: `http://localhost:3100/api`

## Database

Uses separate Prisma schema at `prisma/schema.prisma` (relative to service directory) with its own generated client at `generated/` (relative to service directory).

## Docker

- **Development**: `Dockerfile.dev` - Hot reload enabled
- **Production**: `Dockerfile` - Optimized build

Service is configured in root `docker-compose.dev.yml` as `identity-service`.

