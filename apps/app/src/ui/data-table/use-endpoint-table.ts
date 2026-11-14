"use client"

import { useCallback, useRef, useState } from "react"

import type { DataTableRequest, DataTableRequestContext } from "@toth/table"

import type { TablePage } from "./wire"

export type EndpointTableError = "UNAUTHENTICATED" | "FORBIDDEN" | "FAILED"

/**
 * Feeds an `AsyncDataTable` from a table endpoint (`app/api/tables/*`):
 *
 *     const table = useEndpointTable<MemberRow>("/api/tables/users")
 *     <AsyncDataTable {...table.tableProps} columns={…} />
 *
 * POSTs the table's `DataTableRequest` with the table's abort signal, so a
 * superseded request is cancelled and a late answer never lands on screen.
 * `refresh()` refetches the current view (after a mutation); `externalKey`
 * does the same from outside, e.g. when another table's action affects this one.
 */
export function useEndpointTable<TRow>(url: string, externalKey = 0) {
  const [page, setPage] = useState<TablePage<TRow>>({
    rows: [],
    totalItems: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<EndpointTableError | null>(null)
  const [localKey, setLocalKey] = useState(0)
  const latestRequestRef = useRef(0)

  const getData = useCallback(
    async (request: DataTableRequest, { signal }: DataTableRequestContext) => {
      const id = ++latestRequestRef.current
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
          signal,
        })
        if (!response.ok) {
          throw new EndpointError(
            response.status === 401
              ? "UNAUTHENTICATED"
              : response.status === 403
                ? "FORBIDDEN"
                : "FAILED"
          )
        }
        const data = (await response.json()) as TablePage<TRow>
        if (signal.aborted || id !== latestRequestRef.current) return
        setPage(data)
      } catch (cause) {
        if (signal.aborted || id !== latestRequestRef.current) return
        setError(cause instanceof EndpointError ? cause.code : "FAILED")
      } finally {
        if (!signal.aborted && id === latestRequestRef.current)
          setLoading(false)
      }
    },
    [url]
  )

  const refresh = useCallback(() => setLocalKey((key) => key + 1), [])

  return {
    error,
    refresh,
    /** Spread onto `AsyncDataTable`. */
    tableProps: {
      rows: page.rows,
      totalItems: page.totalItems,
      loading,
      getData,
      refreshToken: `${localKey}:${externalKey}`,
      onRetry: refresh,
    },
  }
}

class EndpointError extends Error {
  constructor(readonly code: EndpointTableError) {
    super(code)
  }
}
