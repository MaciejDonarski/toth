import type { GreetingRepository } from "@/core/greeting/application/ports/greeting-repository"

/**
 * Driven adapter: in-memory implementation of the GreetingRepository port.
 */
export class InMemoryGreetingRepository implements GreetingRepository {
  constructor(private readonly defaultRecipient = "world") {}

  async getDefaultRecipient(): Promise<string> {
    return this.defaultRecipient
  }
}
