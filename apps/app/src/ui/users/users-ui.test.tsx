import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { InvitationsTable } from "./invitations-table"
import { InviteUserForm } from "./invite-user-form"
import { MembersTable, type MemberRow } from "./members-table"

const members: MemberRow[] = [
  {
    id: "me",
    email: "admin@a.pl",
    name: "Anna Admin",
    role: "ADMIN",
    status: "ACTIVE",
    lastLoginAt: null,
  },
  {
    id: "u2",
    email: "w@a.pl",
    name: null,
    role: "WORKER",
    status: "ACTIVE",
    lastLoginAt: Date.UTC(2026, 10, 13, 9),
  },
  {
    id: "u3",
    email: "off@a.pl",
    name: null,
    role: "WORKER",
    status: "DISABLED",
    lastLoginAt: null,
  },
]

function renderMembers(
  canManage: boolean,
  onSetActive = vi.fn().mockResolvedValue({})
) {
  render(
    <MembersTable
      members={members}
      currentUserId="me"
      canManage={canManage}
      onChangeRole={vi.fn().mockResolvedValue({})}
      onSetActive={onSetActive}
    />
  )
  return { onSetActive }
}

describe("MembersTable", () => {
  it("lets admins manage others but never their own row", async () => {
    const { onSetActive } = renderMembers(true)
    const selfRow = screen.getByText("(Ty)").closest("tr") as HTMLElement

    expect(within(selfRow).queryByRole("button")).not.toBeInTheDocument()
    expect(within(selfRow).queryByRole("combobox")).not.toBeInTheDocument()
    expect(
      screen.getByRole("combobox", { name: "Rola: w@a.pl" })
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Wyłącz w@a.pl" }))
    expect(onSetActive).toHaveBeenCalledWith("u2", false)
    await userEvent.click(
      screen.getByRole("button", { name: "Włącz off@a.pl" })
    )
    expect(onSetActive).toHaveBeenCalledWith("u3", true)
  })

  it("is read-only without users.manage", () => {
    renderMembers(false)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(screen.getAllByText("Pracownik")).toHaveLength(2)
  })

  it("shows refusals from the server", async () => {
    renderMembers(
      true,
      vi.fn().mockResolvedValue({
        error: "Firma musi mieć co najmniej jednego aktywnego administratora.",
      })
    )
    await userEvent.click(screen.getByRole("button", { name: "Wyłącz w@a.pl" }))
    expect(
      await screen.findByText(/co najmniej jednego aktywnego administratora/)
    ).toBeInTheDocument()
  })
})

describe("InviteUserForm", () => {
  it("submits email and role, then confirms", async () => {
    const onInvite = vi.fn().mockResolvedValue({ sent: true })
    render(<InviteUserForm onInvite={onInvite} limitReached={false} />)

    await userEvent.type(screen.getByLabelText("Email"), "Nowy@A.pl")
    await userEvent.click(screen.getByRole("button", { name: "Zaproś" }))

    expect(onInvite).toHaveBeenCalledWith({
      email: "nowy@a.pl",
      role: "WORKER",
    })
    expect(
      await screen.findByText(/Wysłano zaproszenie na adres nowy@a.pl/)
    ).toBeInTheDocument()
  })

  it("is disabled with an explanation when the seat limit is reached", () => {
    render(<InviteUserForm onInvite={vi.fn()} limitReached />)
    expect(
      screen.getByText(/Wykorzystano wszystkie miejsca/)
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Zaproś" })).toBeDisabled()
  })
})

describe("InvitationsTable", () => {
  it("revokes by id", async () => {
    const onRevoke = vi.fn().mockResolvedValue({})
    render(
      <InvitationsTable
        invitations={[
          {
            id: "inv-1",
            email: "x@a.pl",
            role: "MANAGER",
            expiresAt: Date.UTC(2026, 10, 16),
          },
        ]}
        canRevoke
        onRevoke={onRevoke}
      />
    )
    expect(screen.getByText("Kierownik")).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "Odwołaj zaproszenie x@a.pl" })
    )
    expect(onRevoke).toHaveBeenCalledWith("inv-1")
  })

  it("says so when there are none", () => {
    render(<InvitationsTable invitations={[]} canRevoke onRevoke={vi.fn()} />)
    expect(screen.getByText("Brak oczekujących zaproszeń.")).toBeInTheDocument()
  })
})
