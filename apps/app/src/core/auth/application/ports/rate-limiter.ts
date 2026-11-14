export type RateLimitRule = Readonly<{
  /** Bucket key, e.g. `login:ip:1.2.3.4`. */
  key: string
  limit: number
  windowMs: number
}>

export type RateLimitResult = Readonly<{
  allowed: boolean
  remaining: number
  resetAt: Date
}>

export interface RateLimiter {
  /** Counts one hit against the bucket and reports whether it is allowed. */
  hit(rule: RateLimitRule): Promise<RateLimitResult>
  reset(key: string): Promise<void>
}
