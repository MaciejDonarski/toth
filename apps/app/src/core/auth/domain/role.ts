/**
 * Domain: user roles within a company. Mirrors the Prisma `Role` enum, but
 * `core/` must not depend on the generated client, so it is declared here.
 */
export const ROLES = ["ADMIN", "MANAGER", "WORKER"] as const

export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  )
}
