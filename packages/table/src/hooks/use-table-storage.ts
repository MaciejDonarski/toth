import * as React from "react"

type StorageRoot = Record<string, Record<string, unknown> | undefined>

function readRoot(storageKey: string): StorageRoot {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StorageRoot)
      : {}
  } catch {
    return {}
  }
}

function writeRoot(storageKey: string, root: StorageRoot): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(root))
  } catch {
    // Storage unavailable (private mode, quota) — persistence is a convenience, never a
    // precondition, so the feature keeps working against its in-memory state.
  }
}

/**
 * Persists a slice of table state to `localStorage[storageKey][scopeId][subKey]`.
 *
 * `scopeId` is `TABLE_ID` on its own, or `TABLE_ID:USER_ID` when a `userId` is supplied — so
 * state can be scoped per user without changing the top-level storage key. When `enabled` is
 * false, reads return `{}` (features fall back to their defaults) and writes are no-ops, so
 * nothing touches localStorage.
 *
 * `read` and `write` change identity only when the scope itself does — a different table id or
 * user — so a caller can list them as dependencies without churn.
 */
export function useTableStorage<TValue extends Record<string, unknown>>(
  storageKey: string,
  tableId: string | undefined,
  subKey: string,
  userId?: string | number,
  enabled = true
) {
  const scopeId =
    userId != null && userId !== "" ? `${tableId}:${userId}` : tableId

  // An absent or unreadable slice comes back as an empty map rather than undefined, so a
  // caller seeds its state with it and the "nothing stored yet" branch disappears.
  const read = React.useCallback((): TValue => {
    if (!enabled || !scopeId) return {} as TValue

    const root = readRoot(storageKey)
    return (root[scopeId]?.[subKey] as TValue) ?? ({} as TValue)
  }, [storageKey, subKey, scopeId, enabled])

  const write = React.useCallback(
    (value: TValue): void => {
      if (!enabled || !scopeId) return

      const root = readRoot(storageKey)
      root[scopeId] = { ...root[scopeId], [subKey]: value }
      writeRoot(storageKey, root)
    },
    [storageKey, subKey, scopeId, enabled]
  )

  return { read, write }
}
