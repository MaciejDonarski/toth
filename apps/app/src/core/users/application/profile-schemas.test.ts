import { describe, expect, it } from "vitest"

import { changePasswordSchema, profileSchema, toProfileUpdate } from "./schemas"

const off = (weekday: number) => ({
  weekday,
  enabled: false,
  start: "",
  end: "",
})
const week = (overrides: Record<number, object> = {}) =>
  [1, 2, 3, 4, 5, 6, 7].map((d) => ({ ...off(d), ...overrides[d] }))

function issues(input: unknown) {
  const result = profileSchema.safeParse(input)
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((i) => [i.path.join("."), i.message])
      )
}

describe("profileSchema", () => {
  it("normalizes phone and builds the weekly schedule", () => {
    const parsed = toProfileUpdate(
      profileSchema.parse({
        name: " Jan Kowalski ",
        phone: "600 100 200",
        days: week({
          1: { enabled: true, start: "08:00", end: "16:00" },
          5: { enabled: true, start: "08:00", end: "14:30" },
          6: { enabled: false, start: "10:00", end: "12:00" }, // unticked = off
        }),
      })
    )
    expect(parsed).toEqual({
      name: "Jan Kowalski",
      phone: "+48600100200",
      schedule: { 1: { start: 480, end: 960 }, 5: { start: 480, end: 870 } },
    })
  })

  it("allows an empty phone and a week without work", () => {
    expect(
      toProfileUpdate(
        profileSchema.parse({ name: "Ewa", phone: "", days: week() })
      )
    ).toEqual({
      name: "Ewa",
      phone: null,
      schedule: {},
    })
  })

  it("reports invalid phone and hours per field, independently", () => {
    expect(
      issues({
        name: "",
        phone: "123",
        days: week({
          2: { enabled: true, start: "16:00", end: "08:00" },
          3: { enabled: true, start: "", end: "25:00" },
        }),
      })
    ).toEqual({
      name: "validation.name.tooShort",
      phone: "validation.phone.invalid",
      "days.1.end": "validation.workingHours.order",
      "days.2.start": "validation.workingHours.invalidTime",
      "days.2.end": "validation.workingHours.invalidTime",
    })
  })

  it("needs all seven days", () => {
    expect(
      profileSchema.safeParse({
        name: "Ewa",
        phone: "",
        days: week().slice(0, 6),
      }).success
    ).toBe(false)
  })
})

describe("changePasswordSchema", () => {
  const base = {
    currentPassword: "Stare#Haslo1",
    newPassword: "Nowe#Haslo1",
    confirmPassword: "Nowe#Haslo1",
  }

  it("accepts a valid change", () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true)
  })

  it("requires confirmation and a different new password", () => {
    const mismatch = changePasswordSchema.safeParse({
      ...base,
      confirmPassword: "x",
    })
    expect(mismatch.error?.issues[0]).toMatchObject({
      path: ["confirmPassword"],
      message: "validation.password.mismatch",
    })
    const same = changePasswordSchema.safeParse({
      currentPassword: "Nowe#Haslo1",
      newPassword: "Nowe#Haslo1",
      confirmPassword: "Nowe#Haslo1",
    })
    expect(same.error?.issues[0]).toMatchObject({
      path: ["newPassword"],
      message: "validation.password.sameAsCurrent",
    })
  })
})
