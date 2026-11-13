/**
 * Outgoing auth notifications. Use cases pass plain tokens; the adapter turns
 * them into absolute links and localized emails.
 */
export interface AuthNotifier {
  sendLoginCode(
    to: string,
    input: { code: string; validForMs: number }
  ): Promise<void>
  sendEmailVerification(
    to: string,
    input: { token: string; validForMs: number }
  ): Promise<void>
  /** Someone tried to register with an email that already has an account. */
  sendRegistrationAttempt(to: string): Promise<void>
  sendPasswordReset(
    to: string,
    input: { token: string; validForMs: number }
  ): Promise<void>
  sendPasswordChanged(to: string): Promise<void>
  sendAccountLocked(to: string, input: { lockedForMs: number }): Promise<void>
  sendInvitation(
    to: string,
    input: { token: string; companyName: string; validForMs: number }
  ): Promise<void>
}
