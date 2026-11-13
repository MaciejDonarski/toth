import { describe, expect, it } from "vitest"

import {
  can,
  PERMISSIONS,
  permissionsFor,
  ROLE_PERMISSIONS,
} from "./permissions"
import { ROLES } from "./role"

describe("role permissions", () => {
  it("matches the agreed matrix (update deliberately)", () => {
    expect(ROLE_PERMISSIONS).toMatchInlineSnapshot(`
      {
        "ADMIN": [
          "dashboard.view",
          "users.view",
          "users.invite",
          "users.manage",
          "settings.view",
          "company.manage",
          "sessions.manage-own",
        ],
        "MANAGER": [
          "dashboard.view",
          "users.view",
          "settings.view",
          "sessions.manage-own",
        ],
        "WORKER": [
          "dashboard.view",
          "sessions.manage-own",
        ],
      }
    `)
  })

  it("gives admins every permission", () => {
    expect(permissionsFor("ADMIN")).toEqual(PERMISSIONS)
  })

  it("keeps lower roles a subset of admin", () => {
    for (const role of ROLES) {
      for (const permission of permissionsFor(role)) {
        expect(can("ADMIN", permission)).toBe(true)
      }
    }
  })

  it("denies workers user management", () => {
    expect(can("WORKER", "users.view")).toBe(false)
    expect(can("WORKER", "users.invite")).toBe(false)
    expect(can("MANAGER", "users.invite")).toBe(false)
    expect(can("MANAGER", "users.view")).toBe(true)
  })
})
