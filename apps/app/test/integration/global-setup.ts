import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { Client } from "pg"

import { TEST_DATABASE_URL } from "../../vitest.integration.config"

/** Creates the test database if needed and applies all migrations to it. */
export default async function setup() {
  const url = new URL(TEST_DATABASE_URL)
  const database = url.pathname.slice(1)
  if (!/^[a-z0-9_]+_test$/.test(database)) {
    throw new Error(`Refusing to run integration tests against "${database}"`)
  }

  const admin = new Client({ connectionString: withDatabase(url, "postgres") })
  await admin.connect()
  const { rowCount } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [database]
  )
  if (!rowCount) await admin.query(`CREATE DATABASE "${database}"`)
  await admin.end()

  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    env: { ...process.env, DIRECT_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  })
}

function withDatabase(url: URL, database: string) {
  const copy = new URL(url)
  copy.pathname = `/${database}`
  return copy.toString()
}
