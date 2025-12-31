# MongoDB Replica Set Transaction Example

## Overview

This document demonstrates how to use MongoDB Replica Set with Prisma transactions to ensure **atomicity** (All or Nothing) when creating related documents across multiple collections.

## Use Case: Register Identity with OTP

When a user registers, we need to:
1. Create an `Identity` record
2. Create an `Otp` record for email verification

**Problem**: If OTP creation fails after Identity is created, we end up with an incomplete state.

**Solution**: Use Prisma transaction to ensure both operations succeed or both fail.

## Implementation

### Method: `registerWithTransaction()`

Located in: `modules/auth/auth.service.ts`

```typescript
async registerWithTransaction(dto: RegisterDto) {
  // ... validation code ...

  // ATOMIC TRANSACTION: Create Identity + OTP together
  const result = await prisma.$transaction(
    async (tx) => {
      // Step 1: Create Identity
      const identity = await tx.identity.create({
        data: {
          email,
          phone,
          passwordHash,
          status: IdentityStatus.PENDING,
        },
      });

      // Step 2: Create OTP (only if email provided)
      // If this fails, Identity creation above will be rolled back automatically
      let otpRecord = null;
      if (email) {
        otpRecord = await tx.otp.create({
          data: {
            identityId: identity.id,
            code: otpHash,
            type: 'EMAIL_VERIFY',
            expiredAt,
            sentCount: 1,
          },
        });
      }

      // Both operations succeed or both fail (atomicity guaranteed by Replica Set)
      return { identity, otpRecord, otpCode };
    },
    {
      maxWait: 5000,  // Maximum time to wait for transaction to start
      timeout: 10000, // Maximum time for transaction to complete
    },
  );

  // After transaction commits, handle Redis operations
  // ...
}
```

## How It Works

### 1. Transaction Start
- Prisma begins a transaction on the MongoDB Replica Set
- All operations within the transaction are queued

### 2. Atomic Operations
- **Step 1**: Create `Identity` document
- **Step 2**: Create `Otp` document (if email provided)

### 3. Transaction Commit or Rollback
- **Success**: Both documents are committed atomically
- **Failure**: If any operation fails, the entire transaction is rolled back
  - Identity creation is undone
  - OTP creation is undone
  - Database returns to previous state

### 4. Post-Transaction Operations
- Redis operations (caching) happen after transaction commits
- These are outside the transaction scope
- If Redis fails, database state is still consistent

## Testing the Transaction

### Endpoint
```
POST /auth/register-with-transaction
```

### Request Body
```json
{
  "email": "user@example.com",
  "phone": "+84901234567",
  "password": "SecurePassword123!"
}
```

### Success Response
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "identity": {
    "id": "...",
    "email": "user@example.com",
    "phone": "+84901234567",
    "status": "PENDING",
    "emailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "demo": {
    "message": "Identity and OTP created atomically in transaction",
    "otpId": "...",
    "otpCode": "123456"
  }
}
```

### Testing Failure Scenarios

#### Test 1: Simulate OTP Creation Failure
To test rollback, you can temporarily modify the code to throw an error:

```typescript
// In transaction, after Identity creation:
if (email) {
  throw new Error('Simulated OTP creation failure');
  // This will cause entire transaction to rollback
}
```

**Expected Result**: 
- No Identity record created
- No OTP record created
- Transaction error returned

#### Test 2: Verify Atomicity
1. Start transaction
2. Create Identity
3. Create OTP with invalid data (e.g., missing required field)
4. Verify both operations are rolled back

## Connection String Configuration

Ensure your `DATABASE_URL` uses Replica Set connection string:

```bash
DATABASE_URL="mongodb://mongodb-primary:27017,mongodb-secondary-1:27017,mongodb-secondary-2:27017/identity_db?replicaSet=rs0&retryWrites=true&w=majority"
```

**Important Parameters**:
- `replicaSet=rs0`: Enables Replica Set mode
- `retryWrites=true`: Enables retryable writes
- `w=majority`: Write concern - ensures writes are acknowledged by majority of nodes

## Benefits of Using Transactions

1. **Atomicity**: All operations succeed or all fail
2. **Consistency**: Database remains in valid state
3. **Error Handling**: Automatic rollback on failure
4. **Data Integrity**: No partial updates

## Transaction Limitations

1. **Performance**: Transactions have overhead - use only when necessary
2. **Timeout**: Long-running transactions may timeout
3. **Isolation**: MongoDB transactions provide snapshot isolation
4. **Replica Set Required**: Transactions require Replica Set (not available in standalone MongoDB)

## Best Practices

1. **Keep transactions short**: Minimize time spent in transaction
2. **Handle errors gracefully**: Catch transaction errors and provide meaningful messages
3. **Use appropriate timeouts**: Set `maxWait` and `timeout` based on your use case
4. **Avoid external operations**: Don't call external APIs within transactions
5. **Test failure scenarios**: Ensure rollback works correctly

## Monitoring

### Check Transaction Status
```bash
# Connect to MongoDB
docker exec -it mongodb-primary mongosh

# Check current operations
db.currentOp({ "active": true, "secs_running": { "$gt": 1 } })

# Check replica set status
rs.status()
```

### Logs
Monitor application logs for transaction errors:
- Transaction timeout errors
- Rollback events
- Performance metrics

## Next Steps

After verifying transactions work correctly:
1. Update production code to use transactions where needed
2. Implement Saga Pattern for cross-service consistency
3. Add monitoring and alerting for transaction failures
4. Optimize transaction performance

