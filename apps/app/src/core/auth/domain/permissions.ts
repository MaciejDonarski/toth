import type { Role } from "./role"

/**
 * Domain: what a user may see or do. Pages, server actions and navigation check
 * permissions, never roles, so the matrix below is the single place to change.
 */
export const PERMISSIONS = [
  "dashboard.view",
  "users.view",
  "users.invite",
  "users.manage",
  "settings.view",
  "company.manage",
  "sessions.manage-own",
  "profile.edit-own",
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> =
  Object.freeze({
    ADMIN: PERMISSIONS,
    MANAGER: [
      "dashboard.view",
      "users.view",
      "settings.view",
      "sessions.manage-own",
      "profile.edit-own",
    ],
    WORKER: ["dashboard.view", "sessions.manage-own", "profile.edit-own"],
  })

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role]
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}
