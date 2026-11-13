import { hash, verify, type Options } from "@node-rs/argon2"

import type { PasswordHasher } from "@/core/auth/application/ports/password-hasher"

/**
 * argon2id with the OWASP-recommended baseline (m=19 MiB, t=2, p=1).
 * `Algorithm` is an ambient const enum (unusable with isolatedModules), so the
 * numeric value is spelled out: 2 = Argon2id.
 */
const ARGON2_OPTIONS: Options = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
}

export class Argon2PasswordHasher implements PasswordHasher {
  #dummyHash: Promise<string> | undefined

  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS)
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password)
    } catch {
      // Malformed hash: treat as a mismatch rather than leaking an error.
      return false
    }
  }

  async verifyDummy(password: string): Promise<void> {
    this.#dummyHash ??= hash("dummy-password-for-timing", ARGON2_OPTIONS)
    await this.verify(await this.#dummyHash, password)
  }
}
