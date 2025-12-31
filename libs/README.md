# @ecom-rmk/libs

Shared libraries and utilities for ecom-rmk microservices.

## Installation

```bash
npm install @ecom-rmk/libs
# or
yarn add @ecom-rmk/libs
```

## Structure

- `common/` - Common DTOs and interceptors
- `redis/` - Redis module and service
- `utils/` - Utility functions

## Usage

```typescript
import { RedisModule, RedisService } from '@ecom-rmk/libs/redis';
import { ErrorResponseDto, HttpExceptionInterceptor } from '@ecom-rmk/libs/common';
import { parseObjectId } from '@ecom-rmk/libs/utils';

// Or import all
import { RedisModule, ErrorResponseDto, parseObjectId } from '@ecom-rmk/libs';
```

## Development

### Build

Compile TypeScript to JavaScript:

```bash
yarn build
```

### Pack (Create tarball)

Create a tarball package file (for testing before publishing):

```bash
yarn pack
# or dry-run to see what will be included
yarn pack:dry
```

This will create a file like `ecom-rmk-libs-0.0.1.tgz` that you can test locally.

### Publish

Publish to npm registry:

```bash
yarn publish
# or for scoped package with access
yarn publish --access public
```

### Test package locally

Before publishing, you can test the package locally:

```bash
# 1. Pack the library
yarn pack

# 2. In another project, install from tarball
yarn add /path/to/ecom-rmk-libs-0.0.1.tgz
```

## Dependencies

This package requires the following peer dependencies (should be installed in the consuming service):

- `@nestjs/common` ^11.0.0
- `@nestjs/config` ^3.0.0

Optional dependencies (if you use specific modules):
- `@nestjs/swagger` (for DTOs)
- `ioredis` (for Redis module)
- `mongodb` (for utils)

