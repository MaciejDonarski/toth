import { createGreeting, type Greeting } from "../domain/greeting"
import type { GreetingRepository } from "./ports/greeting-repository"

export type GetGreetingDeps = Readonly<{
  greetingRepository: GreetingRepository
}>

/**
 * Use case (driving / primary port): build the greeting shown to the user.
 */
export function makeGetGreeting({ greetingRepository }: GetGreetingDeps) {
  return async function getGreeting(recipient?: string): Promise<Greeting> {
    const resolved =
      recipient ?? (await greetingRepository.getDefaultRecipient())
    return createGreeting(resolved)
  }
}

export type GetGreeting = ReturnType<typeof makeGetGreeting>
