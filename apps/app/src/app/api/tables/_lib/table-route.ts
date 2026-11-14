import "server-only"

import { z } from "zod"

import { getCurrentUser } from "@/auth/dal"
import {
  toTenantContext,
  type CurrentUser,
} from "@/core/auth/application/validate-session"
import { isAuthError } from "@/core/auth/domain/errors"
import { can, type Permission } from "@/core/auth/domain/permissions"
import type { TenantContext } from "@/core/auth/domain/tenant-context"
import {
  MAX_PAGE_SIZE,
  type ListPage,
  type ListQuery,
} from "@/core/shared/list-query"
import type { TableError, TablePage } from "@/ui/data-table/wire"

/**
 * The one way a server-backed table gets its rows.
 *
 * Every `app/api/tables/<name>/route.ts` is `export const POST = tableRoute({…})`.
 * The body is `@toth/table`'s `DataTableRequest`; the answer is a `TablePage`.
 * In between, this:
 *  - authenticates from the session cookie and checks `permission`
 *    (401/403 as JSON — the caller is `fetch`, not a browser navigation);
 *  - validates paging (pageSize ≤ MAX_PAGE_SIZE), accepts only whitelisted
 *    sort fields and parses each declared filter, ignoring undeclared keys;
 *  - derives the tenant from the session — never from the request.
 */

const requestSchema = z.object({
  pagination: z.object({
    currentPage: z.int().min(1).max(100_000),
    pageSize: z.int().min(1).max(MAX_PAGE_SIZE),
  }),
  sorting: z
    .object({ field: z.string().max(64), dir: z.enum(["asc", "desc"]) })
    .optional(),
  filtering: z.record(z.string(), z.unknown()).default({}),
})

type FilterParsers<TFilters> = {
  [K in keyof TFilters]-?: z.ZodType<TFilters[K], unknown>
}

export type TableRouteSpec<
  TSort extends string,
  TFilters extends Record<string, unknown>,
  TItem,
  TRow,
> = Readonly<{
  permission: Permission
  /** Sort fields the client may ask for (`sorting.field`). */
  sortable: readonly TSort[]
  /** One parser per filter, keyed by the filter's (server) field. */
  filters: FilterParsers<TFilters>
  load: (
    ctx: TenantContext,
    query: ListQuery<TSort, TFilters>
  ) => Promise<ListPage<TItem>>
  /** Domain item → JSON row. `user` is the caller, e.g. to flag "you". */
  toRow: (item: TItem, user: CurrentUser) => TRow
}>

function json(body: TableError | TablePage<unknown>, status = 200) {
  return Response.json(body, { status })
}

const badRequest = () => json({ error: "BAD_REQUEST" }, 400)

/** Parses the body into a `ListQuery`, or null when anything is off. */
export function parseTableRequest<
  TSort extends string,
  TFilters extends Record<string, unknown>,
>(
  body: unknown,
  sortable: readonly TSort[],
  filters: FilterParsers<TFilters>
): ListQuery<TSort, TFilters> | null {
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return null
  const { pagination, sorting, filtering } = parsed.data

  if (sorting && !(sortable as readonly string[]).includes(sorting.field)) {
    return null
  }

  const parsedFilters: Partial<TFilters> = {}
  for (const key of Object.keys(filters) as (keyof TFilters & string)[]) {
    if (!(key in filtering)) continue
    const value = filters[key].safeParse(filtering[key])
    if (!value.success) return null
    parsedFilters[key] = value.data
  }

  return {
    page: pagination.currentPage,
    pageSize: pagination.pageSize,
    sort: sorting && { field: sorting.field as TSort, dir: sorting.dir },
    filters: parsedFilters,
  }
}

export function tableRoute<
  TSort extends string,
  TFilters extends Record<string, unknown>,
  TItem,
  TRow,
>(spec: TableRouteSpec<TSort, TFilters, TItem, TRow>) {
  return async function POST(request: Request): Promise<Response> {
    const user = await getCurrentUser()
    if (!user) return json({ error: "UNAUTHENTICATED" }, 401)
    if (!can(user.role, spec.permission)) {
      return json({ error: "FORBIDDEN" }, 403)
    }

    const body: unknown = await request.json().catch(() => null)
    const query = parseTableRequest(body, spec.sortable, spec.filters)
    if (!query) return badRequest()

    try {
      const page = await spec.load(toTenantContext(user), query)
      return json({
        rows: page.items.map((item) => spec.toRow(item, user)),
        totalItems: page.total,
      })
    } catch (error) {
      if (isAuthError(error, "FORBIDDEN")) {
        return json({ error: "FORBIDDEN" }, 403)
      }
      throw error
    }
  }
}
