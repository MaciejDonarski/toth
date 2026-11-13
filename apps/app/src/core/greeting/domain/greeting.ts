/**
 * Domain: a greeting addressed to a recipient.
 * Pure TypeScript — no framework, I/O or React imports allowed in `core/`.
 */
export type Greeting = Readonly<{
  recipient: string
  message: string
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
  return Object.freeze({
    recipient: normalized,
    message: `Hello, ${normalized}!`,
  })
}
