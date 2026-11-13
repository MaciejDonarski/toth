import { z } from "zod"

import {
  emailSchema,
  newPasswordSchema,
  personNameSchema,
} from "@/core/auth/application/schemas"
import { ROLES } from "@/core/auth/domain/role"

import {
  isValidRange,
  normalizePhone,
  parseTime,
  WEEKDAYS,
  type TimeRange,
  type Weekday,
  type WeeklySchedule,
} from "../domain/profile"

export const roleSchema = z.enum(ROLES, "validation.role.invalid")

export const inviteUserSchema = z.object({
  email: emailSchema,
  role: roleSchema,
})

export type InviteUserInput = z.input<typeof inviteUserSchema>

const acceptFields = z.object({
  name: personNameSchema,
  password: newPasswordSchema,
  confirmPassword: z.string().min(1, "validation.password.confirmRequired"),
  acceptTerms: z
    .boolean()
    .refine((accepted) => accepted, "validation.terms.required"),
})

const passwordPair = acceptFields.pick({
  password: true,
  confirmPassword: true,
})

export const acceptInvitationSchema = acceptFields.refine(
  (data) => data.password === data.confirmPassword,
  {
    path: ["confirmPassword"],
    message: "validation.password.mismatch",
    when: (payload) => passwordPair.safeParse(payload.value).success,
  }
)

export type AcceptInvitationInput = z.input<typeof acceptInvitationSchema>

export const memberIdSchema = z.string().min(1).max(64)

// --- Own profile ---------------------------------------------------------------

/** One row of the weekly form; `start`/`end` are "HH:MM" strings. */
const workingDaySchema = z
  .object({
    weekday: z.union(WEEKDAYS.map((day) => z.literal(day))),
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  })
  .superRefine((day, ctx) => {
    if (!day.enabled) return
    const start = parseTime(day.start)
    const end = parseTime(day.end)
    if (start === null) {
      ctx.addIssue({
        code: "custom",
        path: ["start"],
        message: "validation.workingHours.invalidTime",
      })
    }
    if (end === null) {
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "validation.workingHours.invalidTime",
      })
    }
    if (start !== null && end !== null && !isValidRange({ start, end })) {
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "validation.workingHours.order",
      })
    }
  })

export const profileSchema = z.object({
  name: personNameSchema,
  phone: z
    .string()
    .trim()
    .max(32, "validation.phone.tooLong")
    .refine(
      (phone) => !phone || normalizePhone(phone) !== null,
      "validation.phone.invalid"
    ),
  days: z.array(workingDaySchema).length(WEEKDAYS.length),
})

export type ProfileInput = z.input<typeof profileSchema>

/** Validated form values → what the profile repository stores. */
export function toProfileUpdate(data: ProfileInput): {
  name: string
  phone: string | null
  schedule: WeeklySchedule
} {
  const schedule: Partial<Record<Weekday, TimeRange>> = {}
  for (const day of data.days) {
    const start = parseTime(day.start)
    const end = parseTime(day.end)
    if (day.enabled && start !== null && end !== null) {
      schedule[day.weekday] = { start, end }
    }
  }
  return {
    name: data.name.trim(),
    phone: data.phone.trim() ? normalizePhone(data.phone) : null,
    schedule: schedule as WeeklySchedule,
  }
}

const changePasswordFields = z.object({
  currentPassword: z.string().min(1, "validation.password.required").max(128),
  newPassword: newPasswordSchema,
  confirmPassword: z.string().min(1, "validation.password.confirmRequired"),
})

const newPasswordPair = changePasswordFields.pick({
  newPassword: true,
  confirmPassword: true,
})

export const changePasswordSchema = changePasswordFields
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.password.mismatch",
    when: (payload) => newPasswordPair.safeParse(payload.value).success,
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "validation.password.sameAsCurrent",
    when: (payload) => changePasswordFields.safeParse(payload.value).success,
  })

export type ChangePasswordInput = z.input<typeof changePasswordSchema>
