import * as React from "react"

import { ToggleGroup, ToggleGroupItem } from "@toth/ui/components/toggle-group"

import { useTableMessages } from "../../hooks/use-table-locale"
import { DataTableViewPanelSection } from "../view-panel"

import { intervalLabel } from "./hooks/use-refresh"

// The Auto-refresh section of View options — the one view setting only a server-backed table has.
//
// It reaches the panel through `slots.viewPanelSections`, which is how `DataTable` stays unaware
// that refreshing exists. Module-level, reading its state from context, for the same reason the
// footer is: a slot component rebuilt per render would remount the segmented control with every
// tick of the clock.

interface AutoRefresh {
  interval: number | null
  intervals: readonly number[]
  setInterval: (interval: number | null) => void
}

const AutoRefreshContext = React.createContext<AutoRefresh | null>(null)

function AsyncAutoRefreshProvider({
  value,
  children,
}: {
  value: AutoRefresh
  children: React.ReactNode
}) {
  return <AutoRefreshContext value={value}>{children}</AutoRefreshContext>
}

// DECISION: the section only appears when `refreshOptions.intervals` are given, as the old
// interval menu did — no table starts offering auto-refresh it did not offer before.
const OFF = "off"

function AsyncAutoRefreshSection() {
  const context = React.use(AutoRefreshContext)
  const messages = useTableMessages()

  if (!context || context.intervals.length === 0) return null

  const { interval, intervals, setInterval } = context

  return (
    <DataTableViewPanelSection title={messages.view.autoRefresh}>
      <ToggleGroup
        variant="outline"
        size="sm"
        className="flex-wrap"
        aria-label={messages.view.autoRefresh}
        value={[interval === null ? OFF : String(interval)]}
        onValueChange={(value: string[]) => {
          const next = value[0]
          // Pressing the current segment reports nothing; a choice is always held.
          if (next === undefined) return
          setInterval(next === OFF ? null : Number(next))
        }}
      >
        <ToggleGroupItem value={OFF}>{messages.view.off}</ToggleGroupItem>
        {intervals.map((candidate) => (
          <ToggleGroupItem key={candidate} value={String(candidate)}>
            {intervalLabel(candidate, messages.refresh)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </DataTableViewPanelSection>
  )
}

export { AsyncAutoRefreshProvider, AsyncAutoRefreshSection }
