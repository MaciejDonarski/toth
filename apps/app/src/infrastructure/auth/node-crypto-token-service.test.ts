import { describe, expect, it } from "vitest"

import { NodeCryptoTokenService } from "./node-crypto-token-service"

const service = new NodeCryptoTokenService("x".repeat(32))

describe("NodeCryptoTokenService", () => {
  it("generates unique url-safe 256-bit tokens", () => {
    const tokens = new Set(
      Array.from({ length: 100 }, () => service.generateToken())
    )
    expect(tokens.size).toBe(100)
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it("generates numeric codes of the requested length", () => {
    for (let i = 0; i < 100; i++) {
      expect(service.generateCode(6)).toMatch(/^\d{6}$/)
    }
  })

  it("hashes tokens deterministically", () => {
    expect(service.hashToken("abc")).toBe(service.hashToken("abc"))
    expect(service.hashToken("abc")).not.toBe(service.hashToken("abd"))
  })

  it("keys code hashes with the secret", () => {
    const other = new NodeCryptoTokenService("y".repeat(32))
    expect(service.hashCode("123456")).not.toBe(other.hashCode("123456"))
    expect(service.hashCode("123456")).not.toBe(service.hashToken("123456"))
  })

  it("compares safely, including different lengths", () => {
    expect(service.safeEqual("abc", "abc")).toBe(true)
    expect(service.safeEqual("abc", "abd")).toBe(false)
    expect(service.safeEqual("abc", "abcd")).toBe(false)
  })

  it("refuses an empty secret", () => {
    expect(() => new NodeCryptoTokenService("")).toThrow()
  })
})
