import "server-only"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"

import { requireTenantWith } from "@/auth/dal"
import { getRequestMeta } from "@/auth/request-meta"
import type { RequestMeta } from "@/core/auth/application/request-meta"
import { isAuthError } from "@/core/auth/domain/errors"
import type { Permission } from "@/core/auth/domain/permissions"
import type { TenantContext } from "@/core/auth/domain/tenant-context"
import type { RowActionResult } from "@/ui/data-table/row-actions"

/** The root (namespace-less) translator. */
export type Translator = Awaited<ReturnType<typeof getTranslations<never>>>

/** Turns a feature's expected refusal into a message, or `null` to rethrow. */
export type RowActionErrorMapper = (
  error: unknown,
  t: Translator
) => string | null

/**
 * The body of every row-action server action:
 *
 *     export async function deleteMemberAction(id: string) {
 *       return runRowAction("users.manage", (ctx, meta) =>
 *         companyUsers.remove(ctx, id, meta), { mapError, revalidate: "/users" })
 *     }
 *
 * Checks `permission` (tenant from the session), runs the use case, maps
 * expected refusals (feature `mapError`, then the common ones) to
 * `{ error }`, rethrows anything else, and revalidates `revalidate`.
 */
export async function runRowAction(
  permission: Permission,
  run: (ctx: TenantContext, meta: RequestMeta) => Promise<unknown>,
  options: { mapError?: RowActionErrorMapper; revalidate?: string } = {}
): Promise<RowActionResult> {
  const ctx = await requireTenantWith(permission)
  try {
    await run(ctx, await getRequestMeta())
  } catch (error) {
    const t = await getTranslations()
    const message = options.mapError?.(error, t) ?? commonError(error, t)
    if (message === null) throw error
    return { error: message }
  }
  if (options.revalidate) revalidatePath(options.revalidate)
  return {}
}

function commonError(error: unknown, t: Translator): string | null {
  if (isAuthError(error, "RATE_LIMITED")) return t("errors.rateLimited")
  if (isAuthError(error, "FORBIDDEN")) return t("errors.forbidden")
  return null
}
