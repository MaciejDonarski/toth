import { describe, expect, it } from "vitest"

import { TABLE_PACKAGE } from "./index"

describe("@toth/table", () => {
  it("exposes its package entry point", () => {
    expect(TABLE_PACKAGE).toBe("@toth/table")
  })
})
