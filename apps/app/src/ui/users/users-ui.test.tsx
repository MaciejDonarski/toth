import { render, screen, waitFor, within } from "@test/render"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { InvitationsTable } from "./invitations-table"
import { InviteUserForm } from "./invite-user-form"
import type { InvitationRow, MemberRow } from "./rows"
import { UsersTable, type UsersTableProps } from "./users-table"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const member = (overrides: Partial<MemberRow>): MemberRow => ({
  id: "u",
  name: null,
  email: "u@a.pl",
  phone: null,
  color: "blue",
  role: "WORKER",
  status: "ACTIVE",
  isSelf: false,
  manageable: true,
  ...overrides,
})

const members: MemberRow[] = [
  member({
    id: "me",
    name: "Anna Admin",
    email: "admin@a.pl",
    phone: "+48 600 100 200",
    role: "ADMIN",
    isSelf: true,
    manageable: false,
  }),
  member({
    id: "a2",
    name: "Adam Admin",
    email: "a2@a.pl",
    role: "ADMIN",
    manageable: false,
  }),
  member({ id: "u2", name: "Wiktor Pracownik", email: "w@a.pl" }),
  member({ id: "u3", email: "off@a.pl", status: "DISABLED" }),
]

/** The table endpoints, answering with fixed rows. */
function serve(rows: { users?: MemberRow[]; invitations?: InvitationRow[] }) {
  const fetchMock = vi.fn(async (url: string) => {
    const list = url.endsWith("/users") ? rows.users : rows.invitations
    return Response.json({ rows: list ?? [], totalItems: list?.length ?? 0 })
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

beforeEach(() => {
  window.localStorage.clear()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

function renderUsers(overrides: Partial<UsersTableProps> = {}) {
  const props: UsersTableProps = {
    currentUserId: "me",
    canManage: true,
    canInvite: true,
    limitReached: false,
    onInvite: vi.fn().mockResolvedValue({ sent: true }),
    onInvited: vi.fn(),
    onChangeRole: vi.fn().mockResolvedValue({}),
    onSetActive: vi.fn().mockResolvedValue({}),
    onDelete: vi.fn().mockResolvedValue({}),
    ...overrides,
  }
  render(<UsersTable {...props} />)
  return props
}

// A nameless member shows the email twice (name fallback + email column).
const rowOf = async (text: string) =>
  (await screen.findAllByText(text))[0]!.closest("tr") as HTMLElement

async function openRowMenu(text: string) {
  const row = await rowOf(text)
  await userEvent.click(
    within(row).getByRole("button", { name: "Akcje wiersza" })
  )
  return screen.findByRole("menu")
}

describe("UsersTable", () => {
  it("asks the users endpoint with the table's request", async () => {
    const fetchMock = serve({ users: members })
    renderUsers()

    await screen.findByText("Wiktor Pracownik")
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe("/api/tables/users")
    expect(JSON.parse(init.body as string)).toMatchObject({
      pagination: { currentPage: 1 },
      filtering: {},
    })
  })

  it("shows avatar + name, the 'Ty' badge, mailto, phone, role and status", async () => {
    serve({ users: members })
    renderUsers()

    const self = await rowOf("Anna Admin")
    expect(within(self).getByText("Ty")).toBeInTheDocument()
    expect(within(self).getByText("AA")).toBeInTheDocument()
    expect(
      within(self).getByRole("link", { name: "admin@a.pl" })
    ).toHaveAttribute("href", "mailto:admin@a.pl")
    expect(within(self).getByText("+48 600 100 200")).toBeInTheDocument()
    expect(within(self).getByText("Administrator")).toBeInTheDocument()
    expect(within(self).getByText("Aktywny")).toBeInTheDocument()
    expect(
      within(await rowOf("off@a.pl")).getByText("Nieaktywny")
    ).toBeInTheDocument()
    expect(
      within(await rowOf("Wiktor Pracownik")).queryByText("Ty")
    ).not.toBeInTheDocument()
  })

  it("has no actions on the own row and on admins", async () => {
    serve({ users: members })
    renderUsers()

    for (const name of ["Anna Admin", "Adam Admin"]) {
      expect(
        within(await rowOf(name)).queryByRole("button", {
          name: "Akcje wiersza",
        })
      ).not.toBeInTheDocument()
    }
  })

  it("offers Dezaktywuj on an active member and Aktywuj on an inactive one", async () => {
    serve({ users: members })
    const props = renderUsers()

    let menu = await openRowMenu("Wiktor Pracownik")
    expect(
      within(menu).queryByRole("menuitem", { name: "Aktywuj" })
    ).not.toBeInTheDocument()
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Dezaktywuj" })
    )
    await waitFor(() =>
      expect(props.onSetActive).toHaveBeenCalledWith("u2", false)
    )

    menu = await openRowMenu("off@a.pl")
    expect(
      within(menu).queryByRole("menuitem", { name: "Dezaktywuj" })
    ).not.toBeInTheDocument()
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Aktywuj" })
    )
    await waitFor(() =>
      expect(props.onSetActive).toHaveBeenCalledWith("u3", true)
    )
  })

  it("deletes only after confirmation", async () => {
    serve({ users: members })
    const props = renderUsers()

    const menu = await openRowMenu("Wiktor Pracownik")
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Usuń" }))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("Usunąć użytkownika Wiktor Pracownik?")
    expect(props.onDelete).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Usuń" }))
    await waitFor(() => expect(props.onDelete).toHaveBeenCalledWith("u2"))
    expect(
      await screen.findByText("Usunięto użytkownika Wiktor Pracownik.")
    ).toBeInTheDocument()
  })

  it("shows a refusal from the server as a toast", async () => {
    serve({ users: members })
    renderUsers({
      onSetActive: vi
        .fn()
        .mockResolvedValue({ error: "Osiągnięto limit użytkowników firmy." }),
    })

    const menu = await openRowMenu("off@a.pl")
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Aktywuj" })
    )
    expect(
      await screen.findByText("Osiągnięto limit użytkowników firmy.")
    ).toBeInTheDocument()
  })

  it("changes the role in a dialog", async () => {
    serve({ users: members })
    const props = renderUsers()

    const menu = await openRowMenu("Wiktor Pracownik")
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Zmień rolę" })
    )
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("Zmień rolę: Wiktor Pracownik")

    await userEvent.click(within(dialog).getByRole("combobox"))
    await userEvent.click(
      await screen.findByRole("option", { name: "Kierownik" })
    )
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Zapisz" })
    )

    await waitFor(() =>
      expect(props.onChangeRole).toHaveBeenCalledWith("u2", "MANAGER")
    )
  })

  it("is read-only without users.manage and without users.invite", async () => {
    serve({ users: members })
    renderUsers({ canManage: false, canInvite: false })

    await screen.findByText("Wiktor Pracownik")
    expect(
      screen.queryByRole("button", { name: "Akcje wiersza" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Zaproś użytkownika" })
    ).not.toBeInTheDocument()
  })

  it("invites from a dialog and reports it", async () => {
    serve({ users: members })
    const props = renderUsers()

    await userEvent.click(
      await screen.findByRole("button", { name: "Zaproś użytkownika" })
    )
    const dialog = await screen.findByRole("dialog")
    await userEvent.type(within(dialog).getByLabelText("Email"), "nowy@a.pl")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Wyślij zaproszenie" })
    )

    await waitFor(() => expect(props.onInvited).toHaveBeenCalled())
    expect(props.onInvite).toHaveBeenCalledWith({
      email: "nowy@a.pl",
      role: "WORKER",
    })
  })
})

describe("InviteUserForm", () => {
  it("submits email and role, then confirms", async () => {
    const onInvite = vi.fn().mockResolvedValue({ sent: true })
    const onSent = vi.fn()
    render(
      <InviteUserForm
        onInvite={onInvite}
        limitReached={false}
        onSent={onSent}
      />
    )

    await userEvent.type(screen.getByLabelText("Email"), "Nowy@A.pl")
    await userEvent.click(
      screen.getByRole("button", { name: "Wyślij zaproszenie" })
    )

    expect(onInvite).toHaveBeenCalledWith({
      email: "nowy@a.pl",
      role: "WORKER",
    })
    expect(
      await screen.findByText(/Wysłano zaproszenie na adres nowy@a.pl/)
    ).toBeInTheDocument()
    expect(onSent).toHaveBeenCalled()
  })

  it("is disabled with an explanation when the seat limit is reached", () => {
    render(<InviteUserForm onInvite={vi.fn()} limitReached />)
    expect(
      screen.getByText(/Wykorzystano wszystkie miejsca/)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Wyślij zaproszenie" })
    ).toBeDisabled()
  })
})

describe("InvitationsTable", () => {
  const invitation: InvitationRow = {
    id: "inv-1",
    email: "x@a.pl",
    role: "MANAGER",
    expiresAt: Date.UTC(2026, 10, 16),
  }

  it("cancels an invitation after confirmation", async () => {
    serve({ invitations: [invitation] })
    const onRevoke = vi.fn().mockResolvedValue({})
    render(
      <InvitationsTable
        currentUserId="me"
        canRevoke
        refreshKey={0}
        onRevoke={onRevoke}
      />
    )

    const menu = await openRowMenu("x@a.pl")
    expect(
      within(await rowOf("x@a.pl")).getByText("Kierownik")
    ).toBeInTheDocument()
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Anuluj zaproszenie" })
    )
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent("Anulować zaproszenie dla x@a.pl?")
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Anuluj zaproszenie" })
    )

    await waitFor(() => expect(onRevoke).toHaveBeenCalledWith("inv-1"))
  })

  it("refetches when refreshKey changes", async () => {
    const fetchMock = serve({ invitations: [invitation] })
    const props = { currentUserId: "me", canRevoke: false, onRevoke: vi.fn() }
    const { rerender } = render(<InvitationsTable {...props} refreshKey={0} />)
    await screen.findByText("x@a.pl")
    const calls = fetchMock.mock.calls.length

    rerender(<InvitationsTable {...props} refreshKey={1} />)
    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(calls + 1))
  })
})
