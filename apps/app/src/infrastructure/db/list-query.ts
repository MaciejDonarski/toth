import type {
  ListQuery,
  ListSort,
  SortDirection,
} from "@/core/shared/list-query"

/**
 * Prisma helpers for `ListQuery` — shared by every repository that serves a
 * paged table, so paging, sorting and text matching behave the same
 * everywhere.
 */

export function toSkipTake(query: ListQuery<string, Record<string, unknown>>) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize }
}

/** `contains`, case-insensitive; `undefined` (= no filter) for a blank term. */
export function containsInsensitive(value: string | undefined) {
  const term = value?.trim()
  return term ? { contains: term, mode: "insensitive" as const } : undefined
}

/** `in`; `undefined` (= no filter) for an empty or absent list. */
export function inList<T>(values: readonly T[] | undefined) {
  return values && values.length > 0 ? { in: [...values] } : undefined
}

/**
 * The chosen sort, then `tiebreak` — which must end on a unique column so the
 * order (and so the paging) is stable across requests.
 */
export function toOrderBy<TField extends string, TOrderBy>(
  sort: ListSort<TField> | undefined,
  columns: Readonly<Record<TField, (dir: SortDirection) => TOrderBy>>,
  tiebreak: TOrderBy[]
): TOrderBy[] {
  return sort ? [columns[sort.field](sort.dir), ...tiebreak] : tiebreak
}
