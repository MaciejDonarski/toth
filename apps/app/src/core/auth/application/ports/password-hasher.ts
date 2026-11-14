export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(hash: string, password: string): Promise<boolean>
  /**
   * Burns the same time as `verify` when there is no user to check against,
   * so response timing does not reveal whether an email is registered.
   */
  verifyDummy(password: string): Promise<void>
}
