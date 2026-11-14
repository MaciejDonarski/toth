import type { Role } from "./role"

/**
 * Domain: who is acting, and on behalf of which company.
 *
 * Built ONLY from a validated server-side session — never from request input.
 * Every tenant-scoped use case and repository method takes it as its first
 * argument and filters by `companyId`.
 */
export type TenantContext = Readonly<{
  userId: string
  companyId: string
  role: Role
}>
