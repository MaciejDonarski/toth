"use server"

import { getCurrentUser, getSessionId } from "@/auth/dal"
import { signOut } from "@/auth/next-auth"
import { getRequestMeta } from "@/auth/request-meta"
import { revokeSession } from "@/composition-root"

/** Revokes the DB session (effective everywhere at once), then clears the cookie. */
export async function logout() {
  const [sessionId, user] = await Promise.all([
    getSessionId(),
    getCurrentUser(),
  ])
  await revokeSession(sessionId, user, await getRequestMeta())
  await signOut({ redirectTo: "/login" })
}
