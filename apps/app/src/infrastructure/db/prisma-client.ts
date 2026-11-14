import "server-only"

import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"

/**
 * Single PrismaClient per process, created lazily on first use so that merely
 * importing the composition root (e.g. in unit tests) needs no DATABASE_URL.
 * In dev, the instance is kept on globalThis so HMR does not open a new pool
 * on every reload. DATABASE_URL is the pooled URL on Supabase (port 6543,
 * ?pgbouncer=true).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export function getPrisma(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient()
  return globalForPrisma.prisma
}
