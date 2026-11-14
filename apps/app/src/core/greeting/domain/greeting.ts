/**
 * Domain: a greeting addressed to a recipient. The wording is UI content
 * (message key `dashboard.greeting`), so the domain only carries the
 * recipient. Pure TypeScript — no framework, I/O or React imports in `core/`.
 */
export type Greeting = Readonly<{
  recipient: string
}>

export class InvalidRecipientError extends Error {
  constructor() {
    super("Greeting recipient must not be empty")
    this.name = "InvalidRecipientError"
  }
}

export function createGreeting(recipient: string): Greeting {
  const normalized = recipient.trim()
  if (normalized.length === 0) {
    throw new InvalidRecipientError()
  }
  return Object.freeze({ recipient: normalized })
}
