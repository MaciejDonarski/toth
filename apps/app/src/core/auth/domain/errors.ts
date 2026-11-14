/**
 * Domain errors for authentication and authorization. Driving adapters map
 * them to generic, user-facing messages (never revealing whether an account
 * exists).
 */
export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "EMAIL_NOT_VERIFIED"
  | "CHALLENGE_INVALID"
  | "CODE_INVALID"
  | "CODE_EXPIRED"
  | "RESEND_TOO_SOON"
  | "RESEND_LIMIT_REACHED"
  | "TOKEN_INVALID"
  | "RATE_LIMITED"
  | "USER_LIMIT_REACHED"
  | "EMAIL_TAKEN"
  | "FORBIDDEN"

export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    /** Optional machine-readable detail, e.g. `retryAt` for lockouts. */
    readonly detail?: Readonly<Record<string, unknown>>
  ) {
    super(code)
    this.name = "AuthError"
  }
}

export function isAuthError(
  error: unknown,
  code?: AuthErrorCode
): error is AuthError {
  return (
    error instanceof AuthError && (code === undefined || error.code === code)
  )
}
