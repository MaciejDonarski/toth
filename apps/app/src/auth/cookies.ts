import "server-only"

import { cookies } from "next/headers"

const isProduction = process.env.NODE_ENV === "production"

/**
 * Auth cookies are httpOnly, SameSite=Lax and, in production, `__Host-`
 * prefixed (Secure, Path=/, no Domain). Plain http on localhost cannot set
 * `__Host-` cookies, hence the prefix only in production.
 */
function cookieName(name: string) {
  return isProduction ? `__Host-toth.${name}` : `toth.${name}`
}

const baseOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
} as const

// --- Email awaiting verification (drives "resend link" on /register/check-email)

const PENDING_EMAIL = cookieName("pending-email")
const PENDING_EMAIL_MAX_AGE_S = 60 * 60

export async function setPendingEmail(email: string) {
  ;(await cookies()).set(PENDING_EMAIL, email, {
    ...baseOptions,
    maxAge: PENDING_EMAIL_MAX_AGE_S,
  })
}

export async function getPendingEmail(): Promise<string | undefined> {
  return (await cookies()).get(PENDING_EMAIL)?.value || undefined
}

export async function clearPendingEmail() {
  ;(await cookies()).delete(PENDING_EMAIL)
}
