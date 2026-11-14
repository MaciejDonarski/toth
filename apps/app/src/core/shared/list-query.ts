/**
 * The paged-list contract every list port speaks: one page, an optional sort
 * on a whitelisted field and a typed filter object. Framework- and
 * table-agnostic; the driving adapter (`app/api/tables/_lib/table-route.ts`)
 * translates the table's wire format into this.
 */

export type SortDirection = "asc" | "desc"

export type ListSort<TField extends string> = Readonly<{
  field: TField
  dir: SortDirection
}>

export type ListQuery<
  TSort extends string,
  TFilters extends Record<string, unknown>,
> = Readonly<{
  /** One-based. */
  page: number
  pageSize: number
  sort?: ListSort<TSort>
  /** Only the filters the user set; absent keys mean "no filter". */
  filters: Readonly<Partial<TFilters>>
}>

export type ListPage<T> = Readonly<{
  items: T[]
  /** Size of the whole filtered result set, not of this page. */
  total: number
}>

/** Upper bound on `pageSize`, enforced where requests enter the app. */
export const MAX_PAGE_SIZE = 100
