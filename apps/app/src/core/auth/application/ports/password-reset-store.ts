export interface PasswordResetStore {
  /**
   * In ONE transaction: consume the active reset token, set the new password
   * (`passwordChangedAt = now`, unlock, mark the email verified), and revoke
   * every session, trusted device and open login challenge of the user.
   * Returns the owner, or null if the token is unknown, used or expired —
   * in which case nothing changes.
   */
  resetWithToken(input: {
    tokenHash: string
    passwordHash: string
    now: Date
  }): Promise<{ userId: string; companyId: string; email: string } | null>
}
