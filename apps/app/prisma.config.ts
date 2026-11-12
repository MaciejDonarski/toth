import "dotenv/config"

import { defineConfig, env } from "prisma/config"

/**
 * Prisma CLI config (generate, migrate, studio).
 * The CLI uses DIRECT_URL, which bypasses the pooler. On Supabase that is
 * port 5432, and the runtime client uses the pooled DATABASE_URL (port 6543).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
})
