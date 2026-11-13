import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto"

import type { TokenService } from "@/core/auth/application/ports/token-service"

export class NodeCryptoTokenService implements TokenService {
  readonly #codeSecret: string

  /** @param codeSecret HMAC key for one-time codes (AUTH_SECRET). */
  constructor(codeSecret: string) {
    if (!codeSecret) {
      throw new Error("NodeCryptoTokenService requires a non-empty secret")
    }
    this.#codeSecret = codeSecret
  }

  generateToken(): string {
    return randomBytes(32).toString("base64url")
  }

  generateCode(length: number): string {
    let code = ""
    for (let i = 0; i < length; i++) {
      code += randomInt(0, 10).toString()
    }
    return code
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex")
  }

  hashCode(code: string): string {
    return createHmac("sha256", this.#codeSecret).update(code).digest("hex")
  }

  safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a)
    const right = Buffer.from(b)
    return left.length === right.length && timingSafeEqual(left, right)
  }
}
