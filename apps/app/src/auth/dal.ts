import "server-only"

import { cache } from "react"
import { forbidden, redirect } from "next/navigation"

import { validateSession } from "@/composition-root"
import {
  toTenantContext,
  type CurrentUser,
} from "@/core/auth/application/validate-session"
import { can, type Permission } from "@/core/auth/domain/permissions"
import type { TenantContext } from "@/core/auth/domain/tenant-context"

import { auth } from "./next-auth"

/**
 * Data Access Layer for authentication. The cookie is only decoded here; the
 * session is always validated against the database. Memoized per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth()
  return validateSession(session?.sid)
})

/** For pages and server actions: the signed-in user, or a redirect to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

/**
 * For pages and server actions: the signed-in user holding `permission`.
 * Anonymous → redirect to /login; signed in without it → 403 (forbidden.tsx).
 * Must be awaited in the render path / action body (it works by throwing).
 */
export async function requirePermission(
  permission: Permission
): Promise<CurrentUser> {
  const user = await requireUser()
  if (!can(user.role, permission)) forbidden()
  return user
}

/**
 * The tenant for data access, for callers that hold `permission`.
 * Always derived from the validated session — never from request input.
 */
export async function requireTenantWith(
  permission: Permission
): Promise<TenantContext> {
  return toTenantContext(await requirePermission(permission))
}

/**
 * The tenant for data access. Always derived from the validated session —
 * never accept a company id from the request.
 */
export async function requireTenant(): Promise<TenantContext> {
  return toTenantContext(await requireUser())
}

/** Plain session id from the JWT, for sign-out. */
export async function getSessionId(): Promise<string | undefined> {
  return (await auth())?.sid
}
