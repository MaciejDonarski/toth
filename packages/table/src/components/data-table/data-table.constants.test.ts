import { describe, expect, it } from "vitest"

import {
  actionsColumnWidth,
  CONTROL_COLUMN_WIDTH,
} from "./data-table.constants"

// These numbers are a copy of three SCSS rules that no TypeScript can read at runtime, so they are
// written out here once where a reviewer can check them against the stylesheets:
// a 28px `icon-sm` button, an 8px gap between two of them, 8px of cell padding on each side.
describe("actionsColumnWidth", () => {
  it("sizes a cell from the controls it holds", () => {
    expect(actionsColumnWidth(1)).toBe(44) // 28 + 16
    expect(actionsColumnWidth(2)).toBe(80) // 28 + 8 + 28 + 16
    expect(actionsColumnWidth(3)).toBe(116) // 28 + 8 + 28 + 8 + 28 + 16
  })

  it("never goes narrower than one control", () => {
    expect(actionsColumnWidth(0)).toBe(CONTROL_COLUMN_WIDTH)
  })

  it("is where the published one-control width comes from", () => {
    expect(CONTROL_COLUMN_WIDTH).toBe(44)
  })
})
