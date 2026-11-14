import * as React from "react"

import { useTableLocale } from "../../hooks/use-table-locale"
import { localeTag } from "../../lib/format"
import type { DataTableFooterProps } from "../table-footer"
import { DataTableFooter } from "../table-footer"

import { formatTime, intervalLabel } from "./hooks/use-refresh"

// The ordinary footer, plus when the rows on screen were fetched — appended to its sentence:
// "1–25 of 67 orders · updated 14:32:05 (auto 15 s)".
//
// It matters against a server precisely because the answer is not obvious: a table that has been
// open for an hour looks exactly like one that was just loaded, and someone about to act on what
// they see deserves to know which they are looking at. It used to be a line of its own above the
// footer; as part of the count it is read in the same glance.
//
// The timestamp arrives through context so this stays a module-level component. A footer rebuilt
// per render would be a new component type per render, and React would remount the whole footer —
// and the page-size select inside it — every time the clock moved.

interface LastUpdate {
  /** When the rows on screen were fetched, or `null` before the first answer. */
  at: number | null
  /** The auto-refresh interval in force, in ms, if any. */
  interval?: number | null
}

const LastUpdateContext = React.createContext<LastUpdate | null>(null)

function AsyncDataTableLastUpdateProvider({
  value,
  children,
}: {
  value: LastUpdate | null
  children: React.ReactNode
}) {
  return <LastUpdateContext value={value}>{children}</LastUpdateContext>
}

function AsyncDataTableFooter(props: DataTableFooterProps) {
  const lastUpdate = React.use(LastUpdateContext)
  const { locale, messages } = useTableLocale()

  if (!lastUpdate || lastUpdate.at === null) {
    return <DataTableFooter {...props} />
  }

  const { at, interval } = lastUpdate

  return (
    <DataTableFooter
      {...props}
      extra={
        <>
          {props.extra ? <>{props.extra} · </> : null}
          {messages.refresh.footerUpdated(
            <time dateTime={new Date(at).toISOString()}>
              {formatTime(at, localeTag(locale))}
            </time>
          )}
          {interval
            ? messages.refresh.footerAuto(
                intervalLabel(interval, messages.refresh)
              )
            : null}
        </>
      }
    />
  )
}

export { AsyncDataTableFooter, AsyncDataTableLastUpdateProvider }
export type { LastUpdate }
