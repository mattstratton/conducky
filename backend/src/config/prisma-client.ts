/**
 * Prisma client factory.
 *
 * Prisma 7 has no built-in database driver: every client needs a driver
 * adapter. Use this instead of `new PrismaClient()` so the adapter and its
 * pool settings live in one place.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export function createAdapter() {
  return new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Prisma 6 gave up connecting after 5s; the pg driver waits forever by default.
    connectionTimeoutMillis: 5000,
  });
}

export function createPrismaClient() {
  return new PrismaClient({ adapter: createAdapter() });
}
