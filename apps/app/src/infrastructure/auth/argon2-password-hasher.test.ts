// @vitest-environment node
import { describe, expect, it } from "vitest"

import { Argon2PasswordHasher } from "./argon2-password-hasher"

const hasher = new Argon2PasswordHasher()

describe("Argon2PasswordHasher", () => {
  it("hashes with argon2id and verifies", async () => {
    const hash = await hasher.hash("Zaq1@wsx")
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/)
    await expect(hasher.verify(hash, "Zaq1@wsx")).resolves.toBe(true)
    await expect(hasher.verify(hash, "zaq1@wsx")).resolves.toBe(false)
  })

  it("salts every hash", async () => {
    expect(await hasher.hash("same")).not.toBe(await hasher.hash("same"))
  })

  it("treats a malformed hash as a mismatch", async () => {
    await expect(hasher.verify("not-a-hash", "x")).resolves.toBe(false)
  })

  it("runs a dummy verification without throwing", async () => {
    await expect(hasher.verifyDummy("anything")).resolves.toBeUndefined()
  })
})
