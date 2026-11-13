import type { Role } from "../../domain/role"

/** A server-side session together with the owner's current account state. */
export type StoredSession = Readonly<{
  id: string
  createdAt: Date
  lastSeenAt: Date
  absoluteExpiresAt: Date
  revokedAt: Date | null
  user: Readonly<{
    id: string
    companyId: string
    email: string
    name: string | null
    role: Role
    status: "ACTIVE" | "DISABLED"
    passwordChangedAt: Date
  }>
}>

export interface SessionRepository {
  /** `id` is the SHA-256 hash of the session id carried in the JWT. */
  create(input: {
    id: string
    userId: string
    companyId: string
    absoluteExpiresAt: Date
    viaTrustedDevice: boolean
    now: Date
    ip?: string
    userAgent?: string
  }): Promise<void>

  findById(id: string): Promise<StoredSession | null>

  touch(id: string, now: Date): Promise<void>

  revoke(id: string, now: Date): Promise<void>
}
