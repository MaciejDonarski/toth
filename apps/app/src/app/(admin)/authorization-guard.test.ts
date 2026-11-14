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

  /** Server actions that intentionally need no permission. */
  const PUBLIC_ACTIONS = new Set(["actions.ts#logout"])

  const actions = files(ADMIN_DIR, /^actions\.ts$/).flatMap((path) => {
    const source = readFileSync(path, "utf8")
    return source
      .split(/(?=export async function )/)
      .slice(1)
      .map((chunk) => {
        const name = /export async function (\w+)/.exec(chunk)?.[1] ?? "?"
        return [`${relative(ADMIN_DIR, path)}#${name}`, chunk] as const
      })
  })

  it("finds the admin server actions", () => {
    expect(actions.length).toBeGreaterThanOrEqual(5)
  })

  it.each(actions.filter(([id]) => !PUBLIC_ACTIONS.has(id)))(
    "%s authorizes before doing anything",
    (_id, body) => {
      // Either directly, or through `runRowAction(permission, …)`, which
      // authorizes first (checked below).
      expect(body).toMatch(
        /await require(TenantWith|Permission)\(\s*"[a-z.-]+"\s*\)|return runRowAction\(\s*"[a-z.-]+"/
      )
    }
  )

  it("runRowAction authorizes before running anything", () => {
    const source = readFileSync(join(ADMIN_DIR, "_lib/row-action.ts"), "utf8")
    const body = source.slice(
      source.indexOf("export async function runRowAction")
    )
    const firstStatement = body.slice(body.indexOf("> {") + 3).trimStart()
    expect(firstStatement).toMatch(
      /^const ctx = await requireTenantWith\(permission\)/
    )
  })
})
