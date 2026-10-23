/**
 * Prisma client factory.
 *
 * Prisma 7 has no built-in database driver: every client needs a driver
 * adapter. Use this instead of `new PrismaClient()` so the adapter and its
 * pool settings live in one place.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Build the `pg` driver adapter Prisma 7 needs, from DATABASE_URL.
 * Used directly by clients that pass their own options (see config/database.ts).
 */
export function createAdapter() {
  return new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Prisma 6 gave up connecting after 5s; the pg driver waits forever by default.
    connectionTimeoutMillis: 5000,
  });
}

/**
 * Create a PrismaClient with default options on the shared adapter setup.
 * Prefer this over `new PrismaClient()`, which has no adapter and throws.
 */
export function createPrismaClient() {
  return new PrismaClient({ adapter: createAdapter() });
}
