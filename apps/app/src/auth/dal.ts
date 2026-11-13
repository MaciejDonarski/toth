import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { validateSession } from "@/composition-root"
import {
  toTenantContext,
  type CurrentUser,
} from "@/core/auth/application/validate-session"
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
