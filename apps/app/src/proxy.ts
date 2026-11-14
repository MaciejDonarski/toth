import { NextResponse, type NextRequest } from "next/server"

/**
 * Optimistic gate only: redirects visitors without a session cookie away from
 * the panel before anything renders. It does NOT validate the session (no
 * database access here, per Next.js guidance) — pages and server actions do
 * that through the DAL (`requireUser`). A stale cookie therefore passes this
 * check and is rejected by the DAL instead.
 */

/** Routes reachable without signing in (prefix match). */
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/regulamin",
]

/** Auth.js session cookie (`__Secure-` on https; may be chunked as `.0`, `.1`…). */
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (isPublic(pathname)) return NextResponse.next()

  const hasSession = request.cookies
    .getAll()
    .some((cookie) => SESSION_COOKIE.test(cookie.name))
  if (hasSession) return NextResponse.next()

  const login = new URL("/login", request.nextUrl)
  if (pathname !== "/") login.searchParams.set("callbackUrl", pathname + search)
  return NextResponse.redirect(login)
}

export const config = {
  // Skip Auth.js endpoints, Next internals and static files.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
}
