import {
  getPath,
  isPlainObject,
  mergeConfig,
  omitKeys,
  pickKeys,
} from "./object"
import { describe, expect, it } from "vitest"

describe("isPlainObject", () => {
  it.each([
    ["an object literal", {}, true],
    ["a null-prototype object", Object.create(null), true],
    ["an array", [], false],
    ["null", null, false],
    ["a string", "x", false],
    ["a Date", new Date(), false],
  ])("reports %s as %s", (_name, value, expected) => {
    expect(isPlainObject(value)).toBe(expected)
  })
})

describe("getPath", () => {
  const row = {
    id: 1,
    customer: { address: { city: "Kraków" }, tags: ["a", "b"] },
  }

  it("reads a top-level key", () => {
    expect(getPath(row, "id")).toBe(1)
  })

  it("walks a dotted path", () => {
    expect(getPath(row, "customer.address.city")).toBe("Kraków")
  })

  it("indexes into an array", () => {
    expect(getPath(row, "customer.tags.1")).toBe("b")
  })

  it("returns undefined for a missing link rather than throwing", () => {
    expect(getPath(row, "customer.billing.city")).toBeUndefined()
  })

  it("stops at a null on the way down", () => {
    expect(getPath({ a: null }, "a.b.c")).toBeUndefined()
  })

  it("returns undefined for an empty path", () => {
    expect(getPath(row, "")).toBeUndefined()
  })
})

describe("mergeConfig", () => {
  type Flat = { a: number; b: number }

  // Inner members optional, which is the shape the real `*Options` bags have — that is what lets
  // a one-level `Partial` still express "override just the page size".
  type Nested = { page: { size?: number; sizes?: number[] } }

  it("applies layers left to right", () => {
    expect(mergeConfig<Flat>({ a: 1, b: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it("merges nested plain objects", () => {
    expect(
      mergeConfig<Nested>(
        { page: { size: 25, sizes: [25] } },
        { page: { size: 50 } }
      )
    ).toEqual({ page: { size: 50, sizes: [25] } })
  })

  it("replaces arrays instead of merging them by index", () => {
    expect(
      mergeConfig<{ sizes: number[] }>(
        { sizes: [25, 50, 100] },
        { sizes: [10, 20] }
      )
    ).toEqual({ sizes: [10, 20] })
  })

  it('treats undefined on a later layer as "not specified"', () => {
    expect(mergeConfig<{ a: number }>({ a: 1 }, { a: undefined })).toEqual({
      a: 1,
    })
  })

  it("treats null on a later layer as a value that wins", () => {
    expect(mergeConfig<{ a: number | null }>({ a: 1 }, { a: null })).toEqual({
      a: null,
    })
  })

  it("ignores missing layers", () => {
    expect(mergeConfig<{ a: number }>(undefined, { a: 1 }, undefined)).toEqual({
      a: 1,
    })
  })

  it("does not mutate its sources", () => {
    const base = { page: { size: 25, sizes: [25] } }
    mergeConfig<Nested>(base, { page: { size: 50 } })

    expect(base.page.size).toBe(25)
  })
})

describe("omitKeys / pickKeys", () => {
  const source = { a: 1, b: 2, c: 3 }

  it("omits the named keys", () => {
    expect(omitKeys(source, ["b"])).toEqual({ a: 1, c: 3 })
  })

  it("keeps only the named keys", () => {
    expect(pickKeys(source, ["a", "c"])).toEqual({ a: 1, c: 3 })
  })

  it("skips a picked key that is not there", () => {
    expect(pickKeys(source, ["a", "zzz"])).toEqual({ a: 1 })
  })

  it("leaves the source alone", () => {
    omitKeys(source, ["a"])
    expect(source).toEqual({ a: 1, b: 2, c: 3 })
  })
})
