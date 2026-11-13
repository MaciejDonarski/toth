import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

/**
 * Integration tests (`*.int.test.ts`) against a real Postgres database,
 * `toth_test` on the compose stack by default (override with TEST_DATABASE_URL).
 * The global setup creates the database and applies migrations.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://toth:toth@localhost:5433/toth_test"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./test/server-only-stub.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    globalSetup: ["./test/integration/global-setup.ts"],
    env: { DATABASE_URL: TEST_DATABASE_URL },
    // Tests share one database; run files one after another.
    fileParallelism: false,
  },
})
