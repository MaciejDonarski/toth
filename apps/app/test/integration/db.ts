import { getPrisma } from "@/infrastructure/db/prisma-client"

/** Shared client for integration tests (DATABASE_URL points at toth_test). */
export const testDb = getPrisma()

/** Removes all rows from every application table. */
export async function truncateAll() {
  const tables = await testDb.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `
  if (tables.length === 0) return
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ")
  await testDb.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`)
}
