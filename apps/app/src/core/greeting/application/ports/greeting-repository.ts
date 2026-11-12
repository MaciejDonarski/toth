/**
 * Driven (secondary) port: where the application gets the greeting recipient from.
 * Implemented by adapters in `src/infrastructure`.
 */
export interface GreetingRepository {
  getDefaultRecipient(): Promise<string>
}
