import "server-only"

import type { TenantContext } from "@/core/auth/domain/tenant-context"
import type { PrismaClient } from "@/generated/prisma/client"

import { getPrisma } from "./prisma-client"

/**
 * The single seam through which tenant-scoped repositories reach the database.
 *
 * Today it only hands over the shared client; repositories still MUST filter
 * every query by `ctx.companyId`. To turn on Postgres RLS later, change only
 * this function: run `fn` inside `prisma.$transaction` after
 * `SELECT set_config('app.company_id', ctx.companyId, true)`.
 */
export async function withTenant<T>(
  ctx: TenantContext,
  fn: (db: PrismaClient, ctx: TenantContext) => Promise<T>
): Promise<T> {
  return fn(getPrisma(), ctx)
}
