import { describe, expect, it } from "vitest"

import type { DataTableRowActionEntry } from "./row-actions"
import {
  countRowActionControls,
  hasUnmeasurableWidth,
  isPromotable,
} from "./row-actions"

interface Row {
  id: number
}

// The count is what the actions column is sized from, so every case here is a column width.
// `icon` is present wherever an action is meant to be promotable — without one the cell has nothing
// to draw in a 28px square, and the action stays a menu row.
const menuOnly = { label: "Archive" }
const promoted = { label: "Edit", icon: "pencil" } as const

function count(entries: DataTableRowActionEntry<Row>[], isMobile = false) {
  return countRowActionControls(entries, isMobile)
}

describe("countRowActionControls", () => {
  it("counts the trigger alone when everything stays in the menu", () => {
    expect(count([menuOnly])).toBe(1)
    expect(count([menuOnly, menuOnly, menuOnly])).toBe(1)
  })

  it("counts a promoted action beside the trigger", () => {
    expect(count([{ ...promoted, standalone: true }, menuOnly, menuOnly])).toBe(
      2
    )
  })

  it("drops the trigger when nothing is left for the menu", () => {
    expect(
      count([
        { ...promoted, standalone: true },
        { label: "Delete", icon: "trash", standalone: true },
        { label: "Copy", icon: "file-down", standalone: true },
      ])
    ).toBe(3)
  })

  it("promotes a 'desktop' action on a wide viewport only", () => {
    const actions: DataTableRowActionEntry<Row>[] = [
      { ...promoted, standalone: "desktop" },
      menuOnly,
    ]

    expect(count(actions)).toBe(2)
    expect(count(actions, true)).toBe(1)
  })

  it("refuses to promote an action with no icon", () => {
    expect(count([{ label: "Edit", standalone: true }, menuOnly])).toBe(1)
  })

  it("drops a statically hidden action", () => {
    expect(
      count([{ ...promoted, standalone: true, hidden: true }, menuOnly])
    ).toBe(1)
  })

  it("reserves width for an action hidden only on some rows", () => {
    // A column is one width all the way down, so the row where it IS visible decides.
    expect(
      count([
        { ...promoted, standalone: true, hidden: (row: Row) => row.id === 1 },
        menuOnly,
      ])
    ).toBe(2)
    expect(
      count([{ ...promoted, standalone: true, hidden: false }, menuOnly])
    ).toBe(2)
  })

  it("needs no column at all when every action is statically hidden", () => {
    expect(
      count([
        { ...menuOnly, hidden: true },
        { ...promoted, hidden: true },
      ])
    ).toBe(0)
    expect(count([])).toBe(0)
  })

  it("does not count grouping — a nested array is a separator, not a control", () => {
    expect(count([[menuOnly, menuOnly], menuOnly])).toBe(1)
    expect(
      count([[menuOnly, { ...promoted, standalone: true }], menuOnly])
    ).toBe(2)
  })

  it("promotes a labelled action with no icon, given a non-icon size", () => {
    expect(
      count([{ label: "Edit", size: "sm", standalone: true }, menuOnly])
    ).toBe(2)
  })
})

describe("isPromotable", () => {
  it("requires an icon at the cell default size", () => {
    expect(isPromotable(menuOnly)).toBe(false)
    expect(isPromotable(promoted)).toBe(true)
  })

  it("needs no icon once a non-icon size is asked for", () => {
    expect(isPromotable({ label: "Edit", size: "sm" })).toBe(true)
    expect(isPromotable({ label: "Edit", size: "icon-lg" })).toBe(false)
  })
})

describe("hasUnmeasurableWidth", () => {
  it("is exact for the cell default and for an icon size", () => {
    expect(hasUnmeasurableWidth(promoted)).toBe(false)
    expect(hasUnmeasurableWidth({ ...promoted, size: "icon-lg" })).toBe(false)
  })

  it("is unknown once the button is sized for a label", () => {
    expect(hasUnmeasurableWidth({ label: "Edit", size: "sm" })).toBe(true)
  })
})
