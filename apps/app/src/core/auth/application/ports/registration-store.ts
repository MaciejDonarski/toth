export type NewCompanyRegistration = Readonly<{
  companyName: string
  userLimit: number
  /** The admin's full name. */
  name: string
  email: string
  passwordHash: string
  termsVersion: string
  termsAcceptedAt: Date
  verificationTokenHash: string
  verificationExpiresAt: Date
}>

export interface RegistrationStore {
  /**
   * Atomically creates the company, its first ADMIN user and the email
   * verification token. Returns "EMAIL_TAKEN" if the email is already
   * registered (including a concurrent registration).
   */
  registerCompanyWithAdmin(
    input: NewCompanyRegistration
  ): Promise<{ userId: string; companyId: string } | "EMAIL_TAKEN">
}
