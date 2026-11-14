import type { TenantContext } from "@/core/auth/domain/tenant-context"
import type {
  OwnProfile,
  PasswordChangeStore,
  ProfileRepository,
  ProfileUpdate,
} from "@/core/users/application/ports/profile-repository"
import {
  WEEKDAYS,
  type TimeRange,
  type Weekday,
  type WeeklySchedule,
} from "@/core/users/domain/profile"
import { isUserColor } from "@/core/users/domain/user-color"
import { withTenant } from "@/infrastructure/db/with-tenant"

/** The caller, and only the caller: user id AND company id from the session. */
const self = (ctx: TenantContext) => ({
  id: ctx.userId,
  companyId: ctx.companyId,
})

function isWeekday(value: number): value is Weekday {
  return (WEEKDAYS as readonly number[]).includes(value)
}

export class PrismaProfileRepository implements ProfileRepository {
  getOwn(ctx: TenantContext): Promise<OwnProfile | null> {
    return withTenant(ctx, async (db) => {
      const user = await db.user.findFirst({
        where: self(ctx),
        select: {
          name: true,
          email: true,
          phone: true,
          color: true,
          role: true,
          workingHours: {
            select: { weekday: true, startMinute: true, endMinute: true },
          },
        },
      })
      if (!user) return null

      const schedule: Partial<Record<Weekday, TimeRange>> = {}
      for (const row of user.workingHours) {
        if (isWeekday(row.weekday)) {
          schedule[row.weekday] = { start: row.startMinute, end: row.endMinute }
        }
      }
      return {
        name: user.name,
        email: user.email,
        phone: user.phone,
        color: isUserColor(user.color) ? user.color : "blue",
        role: user.role,
        schedule: schedule as WeeklySchedule,
      }
    })
  }

  updateOwn(ctx: TenantContext, update: ProfileUpdate): Promise<boolean> {
    return withTenant(ctx, (db) =>
      db.$transaction(async (tx) => {
        const { count } = await tx.user.updateMany({
          where: self(ctx),
          data: {
            name: update.name,
            phone: update.phone,
            color: update.color,
          },
        })
        if (count !== 1) return false

        // Replace the whole week: a removed day becomes a day off.
        await tx.workingHours.deleteMany({ where: { userId: ctx.userId } })
        const rows = Object.entries(update.schedule).map(
          ([weekday, range]) => ({
            userId: ctx.userId,
            weekday: Number(weekday),
            startMinute: range.start,
            endMinute: range.end,
          })
        )
        if (rows.length > 0) await tx.workingHours.createMany({ data: rows })
        return true
      })
    )
  }
}

export class PrismaPasswordChangeStore implements PasswordChangeStore {
  change(
    ctx: TenantContext,
    input: { currentSessionHash: string; passwordHash: string; now: Date }
  ): Promise<boolean> {
    const { currentSessionHash, passwordHash, now } = input
    return withTenant(ctx, (db) =>
      db.$transaction(async (tx) => {
        const { count } = await tx.user.updateMany({
          where: self(ctx),
          data: { passwordHash, passwordChangedAt: now },
        })
        if (count !== 1) return false

        // This session stays valid: it just proved the current password.
        await tx.session.updateMany({
          where: {
            id: currentSessionHash,
            userId: ctx.userId,
            companyId: ctx.companyId,
            revokedAt: null,
          },
          data: { authenticatedAt: now },
        })
        await tx.session.updateMany({
          where: {
            userId: ctx.userId,
            companyId: ctx.companyId,
            revokedAt: null,
            id: { not: currentSessionHash },
          },
          data: { revokedAt: now },
        })
        await tx.trustedDevice.updateMany({
          where: { userId: ctx.userId, revokedAt: null },
          data: { revokedAt: now },
        })
        await tx.loginChallenge.updateMany({
          where: { userId: ctx.userId, consumedAt: null },
          data: { consumedAt: now },
        })
        return true
      })
    )
  }
}
