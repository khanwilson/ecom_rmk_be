# MongoDB Replica Set Setup Guide

## Overview

This project uses MongoDB Replica Set to ensure **Atomicity** (All or Nothing) for operations within a single database. This provides:

- **High Availability**: Automatic failover if primary node fails
- **Data Redundancy**: Data replicated across multiple nodes
- **Read Scalability**: Read operations can be distributed to secondary nodes
- **Atomic Transactions**: Ensures ACID properties for multi-document transactions

## Architecture

The Replica Set consists of 3 nodes:
- **Primary Node** (mongodb-primary): Handles all write operations and primary reads
- **Secondary Node 1** (mongodb-secondary-1): Replicates data from primary
- **Secondary Node 2** (mongodb-secondary-2): Replicates data from primary

## Connection String Format

To connect to the MongoDB Replica Set, use the following connection string format in your `DATABASE_URL` environment variable:

### Development Environment

```bash
# For services running inside Docker (use container names)
DATABASE_URL="mongodb://mongodb-primary:27017,mongodb-secondary-1:27017,mongodb-secondary-2:27017/your-database-name?replicaSet=rs0&retryWrites=true&w=majority"

# For services running on host machine (use localhost)
DATABASE_URL="mongodb://localhost:27017,localhost:27018,localhost:27019/your-database-name?replicaSet=rs0&retryWrites=true&w=majority"
```

### Production Environment

```bash
# Replace with your actual MongoDB hostnames/IPs
DATABASE_URL="mongodb://mongodb-primary:27017,mongodb-secondary-1:27017,mongodb-secondary-2:27017/your-database-name?replicaSet=rs0&retryWrites=true&w=majority"
```

### Connection String Parameters

- `replicaSet=rs0`: Specifies the replica set name (must match the `--replSet` parameter)
- `retryWrites=true`: Enables retryable writes for better reliability
- `w=majority`: Ensures write concern - writes are acknowledged by majority of nodes
- Multiple hosts: Provides automatic failover if one node is unavailable

## Per-Service Database Configuration

Each microservice should use its own database:

### Identity Service
```bash
DATABASE_URL="mongodb://mongodb-primary:27017,mongodb-secondary-1:27017,mongodb-secondary-2:27017/identity_db?replicaSet=rs0&retryWrites=true&w=majority"
```

### Product Service
```bash
DATABASE_URL="mongodb://mongodb-primary:27017,mongodb-secondary-1:27017,mongodb-secondary-2:27017/product_db?replicaSet=rs0&retryWrites=true&w=majority"
```

## Using Transactions with Prisma

With Replica Set configured, you can use Prisma transactions to ensure atomicity:

```typescript
// Example: Atomic transaction
const result = await prisma.$transaction(async (tx) => {
  const identity = await tx.identity.create({
    data: { email, passwordHash, status: 'PENDING' }
  });
  
  const otp = await tx.otp.create({
    data: { identityId: identity.id, code, type: 'EMAIL_VERIFY' }
  });
  
  return { identity, otp };
});
```

If any operation in the transaction fails, all changes are rolled back automatically.

## Starting the Replica Set

1. Start all MongoDB nodes:
```bash
docker-compose -f docker-compose.dev.yml up -d mongodb-primary mongodb-secondary-1 mongodb-secondary-2
```

2. Wait for initialization:
```bash
docker-compose -f docker-compose.dev.yml up mongodb-replica-init
```

3. Verify replica set status:
```bash
docker exec -it mongodb-primary mongosh --eval "rs.status()"
```

## Health Checks

The Replica Set includes health checks:
- Each node pings MongoDB every 10 seconds
- Services wait for MongoDB to be healthy before starting
- Automatic restart on failure

## Monitoring

### Check Replica Set Status
```bash
docker exec -it mongodb-primary mongosh --eval "rs.status()"
```

### Check Primary Node
```bash
docker exec -it mongodb-primary mongosh --eval "rs.isMaster()"
```

### View Replication Lag
```bash
docker exec -it mongodb-primary mongosh --eval "rs.printSlaveReplicationInfo()"
```

## Troubleshooting

### Replica Set Not Initialized
If the replica set fails to initialize:
1. Check logs: `docker logs mongodb-replica-init`
2. Manually initialize:
```bash
docker exec -it mongodb-primary mongosh --eval "rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongodb-primary:27017', priority: 2 },
    { _id: 1, host: 'mongodb-secondary-1:27017', priority: 1 },
    { _id: 2, host: 'mongodb-secondary-2:27017', priority: 1 }
  ]
})"
```

### Connection Issues
- Ensure `replicaSet=rs0` is in the connection string
- Verify all nodes are running: `docker ps | grep mongodb`
- Check network connectivity between containers

## Next Steps: Saga Pattern

After Replica Set is configured, implement **Saga Pattern** to ensure consistency across different microservices and their databases. This will handle distributed transactions between services.

