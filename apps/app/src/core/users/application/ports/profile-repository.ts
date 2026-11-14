import type { Role } from "@/core/auth/domain/role"
import type { TenantContext } from "@/core/auth/domain/tenant-context"

import type { WeeklySchedule } from "../../domain/profile"
import type { UserColor } from "../../domain/user-color"

export type OwnProfile = Readonly<{
  name: string | null
  email: string
  phone: string | null
  color: UserColor
  role: Role
  schedule: WeeklySchedule
}>

export type ProfileUpdate = Readonly<{
  name: string
  phone: string | null
  color: UserColor
  schedule: WeeklySchedule
}>

/**
 * The caller's own profile. Scoped to `ctx.userId` AND `ctx.companyId`;
 * there is deliberately no way to address another user.
 */
export interface ProfileRepository {
  getOwn(ctx: TenantContext): Promise<OwnProfile | null>

  /** Replaces name, phone, color and the whole weekly schedule in one transaction. */
  updateOwn(ctx: TenantContext, update: ProfileUpdate): Promise<boolean>
}

export interface PasswordChangeStore {
  /**
   * In ONE transaction: set the new password (`passwordChangedAt = now`),
   * re-authenticate only the current session (`authenticatedAt = now`),
   * revoke every other session and every trusted device of the caller, and
   * close their open login challenges. False if the caller no longer exists.
   */
  change(
    ctx: TenantContext,
    input: { currentSessionHash: string; passwordHash: string; now: Date }
  ): Promise<boolean>
}
