import { describe, expect, it, vi } from "vitest"

import { makeGetGreeting } from "./get-greeting"
import type { GreetingRepository } from "./ports/greeting-repository"

function fakeRepository(recipient: string): GreetingRepository {
  return { getDefaultRecipient: vi.fn().mockResolvedValue(recipient) }
}

describe("getGreeting use case", () => {
  it("greets the default recipient from the repository port", async () => {
    const greetingRepository = fakeRepository("team")
    const getGreeting = makeGetGreeting({ greetingRepository })

    await expect(getGreeting()).resolves.toEqual({
      recipient: "team",
    })
    expect(greetingRepository.getDefaultRecipient).toHaveBeenCalledOnce()
  })

  it("uses an explicit recipient without hitting the repository", async () => {
    const greetingRepository = fakeRepository("team")
    const getGreeting = makeGetGreeting({ greetingRepository })

    await expect(getGreeting("Ada")).resolves.toMatchObject({
      recipient: "Ada",
    })
    expect(greetingRepository.getDefaultRecipient).not.toHaveBeenCalled()
  })
})
