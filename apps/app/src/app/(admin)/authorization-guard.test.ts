// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

/**
 * Safety net: every page under (admin) must authorize itself, because the
 * layout and proxy are not a security boundary. Fails when someone adds a
 * page without `requirePermission(...)`.
 */
const ADMIN_DIR = fileURLToPath(new URL(".", import.meta.url))

function files(dir: string, name: RegExp): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return files(path, name)
    return name.test(entry.name) ? [path] : []
  })
}

describe("(admin) authorization guard", () => {
  const pages = files(ADMIN_DIR, /^page\.tsx$/)

  it("finds the admin pages", () => {
    expect(pages.length).toBeGreaterThanOrEqual(3)
  })

  it.each(pages.map((p) => [relative(ADMIN_DIR, p), p]))(
    "%s calls requirePermission()",
    (_name, path) => {
      expect(readFileSync(path, "utf8")).toMatch(
        /await requirePermission\(\s*"[a-z.-]+"\s*\)/
      )
    }
  )
})
