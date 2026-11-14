import { describe, expect, it } from "vitest"

import {
  contrastRatio,
  contrastingForeground,
  isUserColor,
  randomUserColor,
  USER_COLORS,
  USER_COLOR_KEYS,
  userColorStyle,
} from "./user-color"

describe("user colors", () => {
  it("picks a foreground with at least 3:1 contrast for every color", () => {
    for (const hex of Object.values(USER_COLORS)) {
      expect(
        contrastRatio(hex, contrastingForeground(hex))
      ).toBeGreaterThanOrEqual(3)
    }
  })

  it("uses dark text on light colors and white on dark ones", () => {
    expect(contrastingForeground(USER_COLORS.yellow)).toBe("#000000")
    expect(contrastingForeground("#1e293b")).toBe("#ffffff")
  })

  it("returns palette keys from randomUserColor", () => {
    expect(randomUserColor(() => 0)).toBe(USER_COLOR_KEYS[0])
    expect(randomUserColor(() => 0.999999)).toBe(USER_COLOR_KEYS.at(-1))
    expect(isUserColor(randomUserColor())).toBe(true)
  })

  it("falls back to a valid style for unknown keys", () => {
    expect(userColorStyle("nope").backgroundColor).toBe(USER_COLORS.blue)
  })
})
