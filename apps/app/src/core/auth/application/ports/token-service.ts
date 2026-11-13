/**
 * Cryptographic primitives for opaque tokens and one-time codes.
 * Plain tokens go to the user (cookie, email link); only hashes are stored.
 */
export interface TokenService {
  /** URL-safe random token with at least 256 bits of entropy. */
  generateToken(): string
  /** Numeric one-time code of the given length, uniformly random. */
  generateCode(length: number): string
  /** Deterministic SHA-256 hash for high-entropy tokens (lookup by hash). */
  hashToken(token: string): string
  /** Keyed HMAC for low-entropy secrets such as 6-digit codes. */
  hashCode(code: string): string
  /** Constant-time comparison of two hashes. */
  safeEqual(a: string, b: string): boolean
}
