import type { DataTableFilter, FilteringState } from "../../lib/filter-types"
import { buildSearchEntry, SEARCH_KEY } from "../../lib/search-filtering"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  DataTableFilterPanel,
  toFilterPayload,
  toFormValues,
} from "./filter-panel"

// Text filters only: every type's own mapping is covered in `filter-types.test.ts`, and what is
// left to test here is what the PANEL does with it — open from the state, apply, reset.
const filters: DataTableFilter[] = [
  { field: "sku", label: "SKU" },
  // Dotted, so the escape into react-hook-form and back is on the path under test.
  { field: "customer.name", label: "Customer" },
]

const search = { [SEARCH_KEY]: buildSearchEntry("widget") }

function setup(
  props: Partial<React.ComponentProps<typeof DataTableFilterPanel>> = {}
) {
  const onApply = vi.fn()
  const onReset = vi.fn()

  render(
    <DataTableFilterPanel
      filters={filters}
      filtering={{}}
      onApply={onApply}
      onReset={onReset}
      {...props}
    />
  )

  return { onApply, onReset }
}

describe("DataTableFilterPanel", () => {
  it("opens showing the filtering in force, dotted fields included", () => {
    setup({ filtering: { sku: "abc", "customer.name": "Ada" } })

    expect(screen.getByLabelText("SKU")).toHaveValue("abc")
    expect(screen.getByLabelText("Customer")).toHaveValue("Ada")
  })

  describe("submitOnChange={false}", () => {
    it("applies nothing while typing, and everything on Apply", async () => {
      const { onApply } = setup({ submitOnChange: false })

      await userEvent.type(screen.getByLabelText("Customer"), "Ada")
      expect(onApply).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole("button", { name: "Apply" }))

      expect(onApply).toHaveBeenCalledTimes(1)
      expect(onApply).toHaveBeenCalledWith({ "customer.name": "Ada" })
    })

    it("carries the search term across an apply it knows nothing about", async () => {
      const { onApply } = setup({ submitOnChange: false, filtering: search })

      await userEvent.type(screen.getByLabelText("SKU"), "abc")
      await userEvent.click(screen.getByRole("button", { name: "Apply" }))

      expect(onApply).toHaveBeenCalledWith({ ...search, sku: "abc" })
    })
  })

  it("applies as the user types, once the debounce settles", async () => {
    const { onApply } = setup({ debounce: 10 })

    await userEvent.type(screen.getByLabelText("SKU"), "abc")

    await vi.waitFor(() =>
      expect(onApply).toHaveBeenLastCalledWith({ sku: "abc" })
    )
  })

  it("offers no Apply button when it applies on change", () => {
    setup()

    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull()
  })

  it("resets the fields and reports it, without a trailing apply", async () => {
    const { onApply, onReset } = setup({
      // Long enough that nothing typed below can settle on its own mid-test.
      debounce: 10_000,
      filtering: { sku: "abc" },
    })

    await userEvent.type(screen.getByLabelText("Customer"), "A")
    await userEvent.click(screen.getByRole("button", { name: "Reset all" }))

    expect(onReset).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText("SKU")).toHaveValue("")
    expect(screen.getByLabelText("Customer")).toHaveValue("")
    expect(onApply).not.toHaveBeenCalled()
  })
})

describe("toFilterPayload / toFormValues", () => {
  it("drops empty fields rather than sending them", () => {
    expect(
      toFilterPayload(filters, { sku: "", "customer-dot-name": "Ada" })
    ).toEqual({
      "customer.name": "Ada",
    })
  })

  it("round-trips a filtering state through the form", () => {
    const filtering: FilteringState = { sku: "abc", "customer.name": "Ada" }

    expect(toFilterPayload(filters, toFormValues(filters, filtering))).toEqual(
      filtering
    )
  })
})
