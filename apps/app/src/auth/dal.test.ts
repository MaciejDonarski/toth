// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { CurrentUser } from "@/core/auth/application/validate-session"
import { permissionsFor } from "@/core/auth/domain/permissions"
import type { Role } from "@/core/auth/domain/role"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  validateSession: vi.fn(),
}))

vi.mock("./next-auth", () => ({ auth: mocks.auth }))
vi.mock("@/composition-root", () => ({
  validateSession: mocks.validateSession,
}))
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
  forbidden: vi.fn(() => {
    throw new Error("FORBIDDEN")
  }),
}))

const { getCurrentUser, requirePermission, requireTenantWith, requireUser } =
  await import("./dal")

function user(role: Role): CurrentUser {
  return {
    id: "u1",
    companyId: "c1",
    email: "jan@firma.pl",
    name: null,
    role,
    permissions: permissionsFor(role),
  }
}

describe("DAL", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ sid: "sid-1" })
  })

  it("validates the session id from the JWT against the database", async () => {
    mocks.validateSession.mockResolvedValue(user("ADMIN"))
    await expect(getCurrentUser()).resolves.toMatchObject({ id: "u1" })
    expect(mocks.validateSession).toHaveBeenCalledWith("sid-1")
  })

  it("redirects anonymous users to /login", async () => {
    mocks.auth.mockResolvedValue(null)
    mocks.validateSession.mockResolvedValue(null)
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login")
  })

  it("returns 403 when the role lacks the permission", async () => {
    mocks.validateSession.mockResolvedValue(user("WORKER"))
    await expect(requirePermission("users.view")).rejects.toThrow("FORBIDDEN")
  })

  it("passes users holding the permission", async () => {
    mocks.validateSession.mockResolvedValue(user("MANAGER"))
    await expect(requirePermission("users.view")).resolves.toMatchObject({
      role: "MANAGER",
    })
  })

  it("derives the tenant from the session only", async () => {
    mocks.validateSession.mockResolvedValue(user("ADMIN"))
    await expect(requireTenantWith("users.invite")).resolves.toEqual({
      userId: "u1",
      companyId: "c1",
      role: "ADMIN",
    })
  })
})
