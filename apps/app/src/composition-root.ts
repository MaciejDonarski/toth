import "server-only"

import { makeGetGreeting } from "@/core/greeting/application/get-greeting"
import { InMemoryGreetingRepository } from "@/infrastructure/greeting/in-memory-greeting-repository"

/**
 * Composition root: the only place that wires ports to concrete adapters.
 * Driving adapters (Next.js routes, server actions) import use cases from here.
 */
const greetingRepository = new InMemoryGreetingRepository()

export const getGreeting = makeGetGreeting({ greetingRepository })
