import { describe, expect, it } from "vitest"

import { permissionsFor } from "@/core/auth/domain/permissions"

import { filterNav, navGroups } from "./nav-config"

const hrefs = (role: "ADMIN" | "MANAGER" | "WORKER") =>
  filterNav(navGroups, permissionsFor(role)).flatMap((g) =>
    g.items.map((i) => i.href)
  )

describe("filterNav", () => {
  it("shows each role only the pages it may open", () => {
    expect(hrefs("ADMIN")).toEqual(["/dashboard", "/users", "/settings"])
    expect(hrefs("MANAGER")).toEqual(["/dashboard", "/users", "/settings"])
    expect(hrefs("WORKER")).toEqual(["/dashboard"])
  })

  it("drops groups without visible items", () => {
    expect(filterNav(navGroups, []).length).toBe(0)
  })
})
