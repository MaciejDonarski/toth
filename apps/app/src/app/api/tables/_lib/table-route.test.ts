// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { CurrentUser } from "@/core/auth/application/validate-session"
import { ROLES } from "@/core/auth/domain/role"

import { multiSelectFilter, selectFilter, textFilter } from "./table-filters"
import { parseTableRequest, tableRoute } from "./table-route"

const getCurrentUser = vi.fn<() => Promise<CurrentUser | null>>()
vi.mock("@/auth/dal", () => ({ getCurrentUser: () => getCurrentUser() }))

const user = (role: CurrentUser["role"]): CurrentUser => ({
  id: "me",
  companyId: "c1",
  email: "me@a.pl",
  name: "Me",
  color: "blue",
  role,
  permissions: [],
})

const filters = {
  name: textFilter,
  role: multiSelectFilter(ROLES),
  kind: selectFilter(["a", "b"]),
}
const sortable = ["name", "role"] as const

const body = (overrides: object = {}) => ({
  fields: ["name"],
  pagination: { currentPage: 2, pageSize: 25 },
  filtering: {},
  ...overrides,
})

describe("parseTableRequest", () => {
  it("maps the table's request onto a ListQuery", () => {
    expect(
      parseTableRequest(
        body({
          sorting: { columnId: "name", field: "name", dir: "desc" },
          filtering: {
            name: "  Anna ",
            role: ["ADMIN"],
            kind: { operator: "eq", value: "b" },
            ignored: "x",
          },
        }),
        sortable,
        filters
      )
    ).toEqual({
      page: 2,
      pageSize: 25,
      sort: { field: "name", dir: "desc" },
      filters: { name: "Anna", role: ["ADMIN"], kind: "b" },
    })
  })

  it.each([
    [
      "an unknown sort field",
      { sorting: { field: "passwordHash", dir: "asc" } },
    ],
    [
      "a page size over the cap",
      { pagination: { currentPage: 1, pageSize: 1000 } },
    ],
    ["page 0", { pagination: { currentPage: 0, pageSize: 10 } }],
    ["an unknown enum value", { filtering: { role: ["OWNER"] } }],
    ["a malformed envelope", { filtering: { kind: "b" } }],
  ])("rejects %s", (_, overrides) => {
    expect(parseTableRequest(body(overrides), sortable, filters)).toBeNull()
  })
})

describe("tableRoute", () => {
  const load = vi.fn(async () => ({ items: [{ id: "x" }], total: 7 }))
  const POST = tableRoute({
    permission: "users.view",
    sortable,
    filters,
    load,
    toRow: (item, caller) => ({ ...item, self: item.id === caller.id }),
  })
  const call = (payload: unknown) =>
    POST(
      new Request("http://x/api/tables/t", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    )

  beforeEach(() => {
    load.mockClear()
    getCurrentUser.mockReset()
  })

  it("answers 401 without a session and 403 without the permission", async () => {
    getCurrentUser.mockResolvedValue(null)
    expect((await call(body())).status).toBe(401)

    getCurrentUser.mockResolvedValue(user("WORKER"))
    const response = await call(body())
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: "FORBIDDEN" })
    expect(load).not.toHaveBeenCalled()
  })

  it("answers 400 to a request it cannot parse", async () => {
    getCurrentUser.mockResolvedValue(user("ADMIN"))
    expect((await call({ nope: true })).status).toBe(400)
  })

  it("loads with the session's tenant and returns a TablePage", async () => {
    getCurrentUser.mockResolvedValue(user("MANAGER"))
    const response = await call(body({ filtering: { name: "a" } }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      rows: [{ id: "x", self: false }],
      totalItems: 7,
    })
    expect(load).toHaveBeenCalledWith(
      { userId: "me", companyId: "c1", role: "MANAGER" },
      expect.objectContaining({ page: 2, filters: { name: "a" } })
    )
  })
})
