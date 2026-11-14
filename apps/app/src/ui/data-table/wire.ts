/**
 * The standard response of every table endpoint (`app/api/tables/*`). The
 * request is `@toth/table`'s `DataTableRequest`, sent as the JSON body of a
 * POST. Types only, so both the route handlers and the client hook use them.
 */
export type TablePage<TRow> = {
  rows: TRow[]
  totalItems: number
}

/** Body of a non-2xx table response. */
export type TableError = {
  error: "UNAUTHENTICATED" | "FORBIDDEN" | "BAD_REQUEST"
}
