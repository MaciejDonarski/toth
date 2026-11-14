const DEFAULT_AFTER_LOGIN = "/dashboard"

/** Pages a signed-in user should never be sent back to. */
const AUTH_PAGES = ["/login", "/register", "/verify-email"]

/**
 * Only same-origin, absolute paths are allowed as post-login targets
 * (prevents open redirects such as `//evil.com` or `/\evil.com`).
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_AFTER_LOGIN
  if (!value.startsWith("/") || value.startsWith("//"))
    return DEFAULT_AFTER_LOGIN
  if (/[\\\s]/.test(value) || value.includes("://")) return DEFAULT_AFTER_LOGIN

  const pathname = value.split(/[?#]/)[0] ?? ""
  if (AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return DEFAULT_AFTER_LOGIN
  }
  return value
}
