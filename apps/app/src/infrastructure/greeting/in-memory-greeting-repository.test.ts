import { describe, expect, it } from "vitest"

import { InMemoryGreetingRepository } from "./in-memory-greeting-repository"

describe("InMemoryGreetingRepository", () => {
  it("defaults to 'world'", async () => {
    await expect(
      new InMemoryGreetingRepository().getDefaultRecipient()
    ).resolves.toBe("world")
  })

  it("returns the configured recipient", async () => {
    await expect(
      new InMemoryGreetingRepository("Ada").getDefaultRecipient()
    ).resolves.toBe("Ada")
  })
})
