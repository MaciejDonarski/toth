export interface TrustedDeviceRepository {
  create(input: {
    userId: string
    tokenHash: string
    userAgent?: string
    expiresAt: Date
    now: Date
  }): Promise<void>

  /**
   * A device for this user that is unrevoked, unexpired and was trusted no
   * earlier than `trustedSince` (the user's last password change).
   */
  findValid(input: {
    tokenHash: string
    userId: string
    now: Date
    trustedSince: Date
  }): Promise<{ id: string } | null>

  touch(id: string, now: Date): Promise<void>
}
