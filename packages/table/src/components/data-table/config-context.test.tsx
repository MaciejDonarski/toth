import { renderHook } from "@testing-library/react"
import { pl } from "date-fns/locale"
import type * as React from "react"
import { describe, expect, it } from "vitest"

import { useTableLocale } from "../../hooks/use-table-locale"
import type { DataTableConfig } from "../../lib/data-table-config-context"
import { enMessages, plMessages } from "../../lib/messages"
import { DataTableConfigProvider, useDataTableConfig } from "./config-context"
import type { DataTableProps } from "./data-table.types"

type Row = { id: string }

/** The two props a table cannot do without, and nothing else — the provider is what is under test. */
const ownProps: DataTableProps<Row> = { columns: [], rows: [] }

const language: DataTableConfig = {
  locale: pl,
  dateFormat: "dd.MM.yyyy",
  dateTimeFormat: "dd.MM.yyyy HH:mm",
  messages: plMessages,
}

function withConfig(config: DataTableConfig) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <DataTableConfigProvider config={config}>
        {children}
      </DataTableConfigProvider>
    )
  }
}

describe("DataTableConfigProvider", () => {
  it("leaves a table alone when there is no provider", () => {
    const { result } = renderHook(() => useDataTableConfig(ownProps))

    // The same object, not a copy of it: the common case is no provider, and it should cost
    // nothing — a fresh object here would re-resolve every table under it every render.
    expect(result.current).toBe(ownProps)
  })

  it("fills in what a table leaves unsaid, and loses to what it says", () => {
    const { result } = renderHook(
      () => useDataTableConfig({ ...ownProps, userId: "own" }),
      {
        wrapper: withConfig({ userId: "app-wide", persistState: true }),
      }
    )

    expect(result.current.persistState).toBe(true)
    expect(result.current.userId).toBe("own")
  })

  it("keeps the language settings out of a table’s props", () => {
    const { result } = renderHook(() => useDataTableConfig(ownProps), {
      wrapper: withConfig({ userId: "app-wide", ...language }),
    })

    // They are not props of one table — `useTableLocale()` reads them from the context in
    // whichever part needs them. Leaking them into the props would make `<DataTable
    // messages={…}>` type-check and then silently do nothing.
    for (const key of ["locale", "dateFormat", "dateTimeFormat", "messages"]) {
      expect(result.current).not.toHaveProperty(key)
    }
    expect(result.current.userId).toBe("app-wide")
  })

  it("keeps the async layer’s settings out of a plain table’s props", () => {
    const { result } = renderHook(() => useDataTableConfig(ownProps), {
      wrapper: withConfig({
        userId: "app-wide",
        refreshOptions: { intervals: [15000] },
        withLastUpdate: true,
      }),
    })

    // `AsyncDataTable` resolves those against its own props; a `DataTable` has none to match.
    expect(result.current).not.toHaveProperty("refreshOptions")
    expect(result.current).not.toHaveProperty("withLastUpdate")
    expect(result.current.userId).toBe("app-wide")
  })

  it("serves the language settings to whatever below asks for them", () => {
    const { result } = renderHook(() => useTableLocale(), {
      wrapper: withConfig(language),
    })

    expect(result.current.locale).toBe(pl)
    expect(result.current.dateFormat).toBe("dd.MM.yyyy")
    expect(result.current.messages.filters.apply).toBe("Zastosuj")
  })

  it("speaks English with `PP` dates outside a provider", () => {
    const { result } = renderHook(() => useTableLocale())

    expect(result.current.locale).toBeUndefined()
    expect(result.current.dateFormat).toBe("PP")
    expect(result.current.messages).toBe(enMessages)
  })

  it("lets a nested provider override messages key by key", () => {
    const { result } = renderHook(() => useTableLocale(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <DataTableConfigProvider config={language}>
          <DataTableConfigProvider
            config={{ messages: { filters: { apply: "Filtruj" } } }}
          >
            {children}
          </DataTableConfigProvider>
        </DataTableConfigProvider>
      ),
    })

    expect(result.current.messages.filters.apply).toBe("Filtruj")
    expect(result.current.messages.filters.reset).toBe("Wyczyść wszystkie")
    expect(result.current.locale).toBe(pl)
  })
})
