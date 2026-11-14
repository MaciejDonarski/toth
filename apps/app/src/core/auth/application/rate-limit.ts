import { AuthError } from "../domain/errors"
import type { RateLimiter, RateLimitRule } from "./ports/rate-limiter"

/** Counts a hit and throws RATE_LIMITED (with `retryAt`) when over the limit. */
export async function enforceRateLimit(
  rateLimiter: RateLimiter,
  rule: RateLimitRule
): Promise<void> {
  const result = await rateLimiter.hit(rule)
  if (!result.allowed) {
    throw new AuthError("RATE_LIMITED", { retryAt: result.resetAt })
  }
}

/** Counts a hit and reports whether it was allowed, without throwing. */
export async function withinRateLimit(
  rateLimiter: RateLimiter,
  rule: RateLimitRule
): Promise<boolean> {
  return (await rateLimiter.hit(rule)).allowed
}

export function ipKey(scope: string, ip: string | undefined): string {
  return `${scope}:ip:${ip ?? "unknown"}`
}

export function emailKey(scope: string, email: string): string {
  return `${scope}:email:${email}`
}
