import 'dotenv/config';
import { PrismaClient } from 'generated/prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Explicit connection on module load to catch connection errors early
prisma
  .$connect()
  .then(() => {
    console.log('[Prisma] Connected to database');
  })
  .catch((error) => {
    console.error('[Prisma] Failed to connect to database:', error);
  });

export { prisma };
