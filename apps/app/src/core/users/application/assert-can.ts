import { AuthError } from "@/core/auth/domain/errors"
import { can, type Permission } from "@/core/auth/domain/permissions"
import type { TenantContext } from "@/core/auth/domain/tenant-context"

/** Defense in depth: use cases re-check the permission, not only the caller. */
export function assertCan(ctx: TenantContext, permission: Permission): void {
  if (!can(ctx.role, permission)) throw new AuthError("FORBIDDEN")
}
