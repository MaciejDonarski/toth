import * as React from "react"

import { useTableLocale } from "../../../hooks/use-table-locale"
import { useTableStorage } from "../../../hooks/use-table-storage"
import { localeTag } from "../../../lib/format"
import type { TableMessages } from "../../../lib/messages"
import {
  DATA_TABLE_STORAGE_KEY,
  REFRESH_ACTION_ORDER,
} from "../../data-table/data-table.constants"
import type { DataTableActionEntry } from "../../data-table/data-table.types"
import type { DataTableRefreshOptions } from "../async-data-table.types"

export interface UseRefreshOptions {
  /** Refetches the state the table is in right now. */
  refresh: () => void
  options?: DataTableRefreshOptions
  /** A request is in flight — the icon turns while it is. */
  loading?: boolean
  /** When the rows on screen were fetched, for the tooltip. */
  lastUpdate?: number | null
  /**
   * Where the chosen interval is remembered, with `persistState` — the table's own storage, under
   * `autoRefresh`. A stored choice wins over `options.enabled` / `options.interval`, including a
   * stored "off".
   */
  storage?: {
    storageKey: string
    tableId?: string
    userId?: string | number
    persistState?: boolean
  }
}

/** How an interval reads: whole minutes as minutes, anything else as seconds. */
function intervalLabel(ms: number, messages: TableMessages["refresh"]): string {
  const seconds = Math.round(ms / 1000)

  return seconds % 60 === 0
    ? messages.minutes(seconds / 60)
    : messages.seconds(seconds)
}

/** The time of day, in the table's locale and the reader's zone — a "how stale is this?" question. */
function formatTime(timestamp: number, locale?: string): string {
  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

/**
 * The Refresh control, and the timer behind it.
 *
 * One icon button, whatever the options. It turns while a request is in flight (`aria-busy`),
 * carries a green dot while auto-refresh is running (`data-auto`), and its tooltip says when the
 * rows were fetched and how often they refetch — "Refresh · updated 14:32:05 · auto every 15 s".
 * Choosing the interval is a view setting, so it lives in View options rather than on the button:
 * this hook hands back `interval` and `setInterval` for that panel to drive.
 *
 * Auto-refresh is off unless asked for, and deliberately: a table that refetches on its own moves
 * under the reader, and doing that uninvited is worse than making them click.
 */
export function useRefresh({
  refresh,
  options,
  loading = false,
  lastUpdate = null,
  storage,
}: UseRefreshOptions) {
  const { locale, messages: allMessages } = useTableLocale()
  const messages = allMessages.refresh
  // Memoised on the array the caller gave: an inline `?? []` would be a new array every render.
  const intervals = React.useMemo(
    () => options?.intervals ?? [],
    [options?.intervals]
  )
  const { read, write } = useTableStorage<{ interval?: number | null }>(
    storage?.storageKey ?? DATA_TABLE_STORAGE_KEY,
    storage?.tableId,
    "autoRefresh",
    storage?.userId,
    storage?.persistState ?? false
  )
  // The plain setter name is the public one this hook returns, which also persists.
  // eslint-disable-next-line @eslint-react/use-state
  const [interval, setIntervalState] = React.useState<number | null>(() => {
    const stored = read()

    if ("interval" in stored) return stored.interval ?? null

    return options?.enabled ? (options?.interval ?? null) : null
  })

  // The one place a choice is made, written to storage from the handler — never from an updater.
  const setInterval = React.useCallback(
    (next: number | null) => {
      setIntervalState(next)
      write({ interval: next })
    },
    [write]
  )

  // The timer must always fire the CURRENT refresh, and `refresh` changes identity as the state
  // it closes over does. Restarting the timer on every one of those would mean a table that is
  // being interacted with never actually auto-refreshes.
  const refreshRef = React.useRef(refresh)

  React.useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  React.useEffect(() => {
    if (interval === null || interval <= 0) {
      return undefined
    }

    const timer = window.setInterval(() => refreshRef.current(), interval)

    return () => window.clearInterval(timer)
  }, [interval])

  const isAuto = interval !== null && interval > 0

  const tooltip = loading
    ? messages.refreshing
    : [
        messages.label,
        lastUpdate !== null
          ? messages.updated(formatTime(lastUpdate, localeTag(locale)))
          : null,
        isAuto ? messages.autoEvery(intervalLabel(interval, messages)) : null,
      ]
        .filter(Boolean)
        .join(" · ")

  // The tooltip rides on `title`: Refresh is icon-only, and `Actions` draws an icon-only action's
  // `title` as its tooltip in place of the label.
  const refreshAction = React.useMemo<DataTableActionEntry>(
    () => ({
      key: "refresh",
      label: messages.label,
      icon: "refresh-cw",
      variant: "ghost",
      size: "icon",
      order: REFRESH_ACTION_ORDER,
      standalone: true,
      title: tooltip,
      // Turns while a request is in flight; a green dot while auto-refresh runs.
      className:
        "relative aria-busy:[&_svg]:animate-spin motion-reduce:aria-busy:[&_svg]:animate-none data-auto:after:absolute data-auto:after:top-1.5 data-auto:after:right-1.5 data-auto:after:size-[7px] data-auto:after:rounded-full data-auto:after:bg-emerald-500 data-auto:after:shadow-[0_0_0_2px_var(--color-background)]",
      // A `<button>` of our own to render as, purely to carry the two state attributes the
      // stylesheet draws from. `aria-busy` here is not Button's `loading`: the icon turns,
      // but the button stays clickable — a second click restarts the request.
      render: (
        <button
          type="button"
          aria-busy={loading || undefined}
          data-auto={isAuto ? "" : undefined}
        />
      ),
      onClick: refresh,
    }),
    [refresh, tooltip, loading, isAuto, messages.label]
  )

  return { refreshAction, interval, setInterval, intervals }
}

export { formatTime, intervalLabel }
