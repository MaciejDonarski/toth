import type { AuthEventLog } from "@/core/auth/application/ports/auth-event-log"
import type { AuthNotifier } from "@/core/auth/application/ports/auth-notifier"
import type { Clock } from "@/core/auth/application/ports/clock"
import type { PasswordHasher } from "@/core/auth/application/ports/password-hasher"
import type { RateLimiter } from "@/core/auth/application/ports/rate-limiter"
import type { TokenService } from "@/core/auth/application/ports/token-service"
import type { UserAccountRepository } from "@/core/auth/application/ports/user-account-repository"
import { enforceRateLimit } from "@/core/auth/application/rate-limit"
import type { RequestMeta } from "@/core/auth/application/request-meta"
import { AUTH_POLICY } from "@/core/auth/domain/auth-policy"
import { AuthError } from "@/core/auth/domain/errors"
import type { TenantContext } from "@/core/auth/domain/tenant-context"

import { assertCan } from "./assert-can"
import type {
  OwnProfile,
  PasswordChangeStore,
  ProfileRepository,
} from "./ports/profile-repository"
import {
  changePasswordSchema,
  profileSchema,
  toProfileUpdate,
  type ChangePasswordInput,
  type ProfileInput,
} from "./schemas"

export type ProfileDeps = Readonly<{
  profiles: ProfileRepository
  passwordChanges: PasswordChangeStore
  users: UserAccountRepository
  passwordHasher: PasswordHasher
  tokenService: TokenService
  rateLimiter: RateLimiter
  notifier: AuthNotifier
  events: AuthEventLog
  clock: Clock
}>

/** Use cases for the signed-in user's own profile. */
export function makeProfile(deps: ProfileDeps) {
  function record(
    ctx: TenantContext,
    type: "profile_updated" | "password_changed",
    meta: RequestMeta
  ) {
    return deps.events.record({
      type,
      userId: ctx.userId,
      companyId: ctx.companyId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
  }

  return {
    async get(ctx: TenantContext): Promise<OwnProfile> {
      assertCan(ctx, "profile.edit-own")
      const profile = await deps.profiles.getOwn(ctx)
      if (!profile) throw new AuthError("FORBIDDEN")
      return profile
    },

    async update(ctx: TenantContext, input: ProfileInput, meta: RequestMeta) {
      assertCan(ctx, "profile.edit-own")
      const data = toProfileUpdate(profileSchema.parse(input))
      const updated = await deps.profiles.updateOwn(ctx, data)
      if (!updated) throw new AuthError("FORBIDDEN")
      await record(ctx, "profile_updated", meta)
    },

    /**
     * Throws INVALID_CREDENTIALS (wrong current password), RATE_LIMITED or
     * FORBIDDEN. Keeps `sessionId` signed in; signs out everything else.
     */
    async changePassword(
      ctx: TenantContext,
      sessionId: string | undefined,
      input: ChangePasswordInput,
      meta: RequestMeta
    ) {
      assertCan(ctx, "profile.edit-own")
      const data = changePasswordSchema.parse(input)
      if (!sessionId) throw new AuthError("FORBIDDEN")

      await enforceRateLimit(deps.rateLimiter, {
        key: `password-change:user:${ctx.userId}`,
        ...AUTH_POLICY.rateLimits.passwordChangePerUser,
      })

      const account = await deps.users.findById(ctx.userId)
      if (!account || account.companyId !== ctx.companyId) {
        throw new AuthError("FORBIDDEN")
      }
      const currentOk = await deps.passwordHasher.verify(
        account.passwordHash,
        data.currentPassword
      )
      if (!currentOk) throw new AuthError("INVALID_CREDENTIALS")

      const changed = await deps.passwordChanges.change(ctx, {
        currentSessionHash: deps.tokenService.hashToken(sessionId),
        passwordHash: await deps.passwordHasher.hash(data.newPassword),
        now: deps.clock.now(),
      })
      if (!changed) throw new AuthError("FORBIDDEN")

      await record(ctx, "password_changed", meta)
      try {
        await deps.notifier.sendPasswordChanged(account.email)
      } catch {
        // The password is already changed; a failed notice must not undo that.
      }
    },
  }
}

export type Profile = ReturnType<typeof makeProfile>
