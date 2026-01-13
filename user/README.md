# User Service

User Service manages user profiles, addresses, and preferences.

## Description

This service handles:
- **User Profiles**: Personal information (name, avatar, birthday, gender)
- **User Addresses**: Multiple delivery addresses per user
- **User Preferences**: Settings, language, currency, notification preferences

## Database

- **Database URL**: `DATABASE_URL_USER`
- **Collections**:
  - `User`: Profile information
  - `UserAddress`: Delivery addresses
  - `UserPreference`: User settings and preferences

## Project setup

```bash
$ bun install
```

## Prisma Setup

```bash
# Generate Prisma client
$ bunx prisma generate

# Push schema to database
$ bunx prisma db push
```

## Running the app

```bash
# development
$ bun run start:dev

# watch mode
$ bun run start

# production mode
$ bun run start:prod
```

## Environment Variables

Required environment variables:
- `USER_PORT`: Port for the service (default: 3003)
- `DATABASE_URL_USER`: MongoDB connection string for User database
- `KAFKA_BROKER`: Kafka broker address (default: kafka:9092)
- Redis and other shared infrastructure variables

## API Documentation

Once the service is running, Swagger documentation is available at:
- `http://localhost:${USER_PORT}/api`

## Service Port

Default port: `3003`

## License

UNLICENSED
