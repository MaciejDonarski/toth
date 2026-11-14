import { describe, expect, it } from "vitest"

import {
  formatPhone,
  formatTime,
  isValidRange,
  normalizePhone,
  parseTime,
} from "./profile"

describe("working hours", () => {
  it.each([
    ["08:00", 480],
    ["00:00", 0],
    ["16:45", 1005],
    ["24:00", 1440],
    [" 9:00", null],
    ["24:01", null],
    ["25:00", null],
    ["8:00", null],
    ["", null],
  ])("parseTime(%j) → %j", (input, expected) => {
    expect(parseTime(input)).toBe(expected)
  })

  it("formats minutes back to HH:MM", () => {
    expect(formatTime(480)).toBe("08:00")
    expect(formatTime(1440)).toBe("24:00")
  })

  it("accepts only ranges within one day, start before end", () => {
    expect(isValidRange({ start: 480, end: 960 })).toBe(true)
    expect(isValidRange({ start: 0, end: 1440 })).toBe(true)
    expect(isValidRange({ start: 960, end: 480 })).toBe(false) // overnight
    expect(isValidRange({ start: 480, end: 480 })).toBe(false)
    expect(isValidRange({ start: -1, end: 60 })).toBe(false)
    expect(isValidRange({ start: 60, end: 1441 })).toBe(false)
  })
})

describe("phone numbers", () => {
  it.each([
    ["600 100 200", "+48600100200"],
    ["600-100-200", "+48600100200"],
    ["+48 600 100 200", "+48600100200"],
    ["0048600100200", "+48600100200"],
    ["+49 30 901820", "+4930901820"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it.each(["", "123", "abc", "600 100 20", "+48 000 000 000"])(
    "rejects %j",
    (input) => {
      expect(normalizePhone(input)).toBeNull()
    }
  )

  it("formats for display", () => {
    expect(formatPhone("+48600100200")).toBe("+48 600 100 200")
  })
})
