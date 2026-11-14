/**
 * Domain: account status. Mirrors the Prisma `UserStatus` enum (core/ must not
 * depend on the generated client). Only ACTIVE may sign in; DELETED is an
 * anonymized account and never shown in member lists.
 */
export const USER_STATUSES = ["ACTIVE", "DISABLED", "DELETED"] as const

export type UserStatus = (typeof USER_STATUSES)[number]
