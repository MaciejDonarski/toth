import { render, screen, within } from "@test/render"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { ProfileInput } from "@/core/users/application/schemas"

import { ChangePasswordForm } from "./change-password-form"
import { ProfileForm } from "./profile-form"

const defaults: ProfileInput = {
  name: "Jan Kowalski",
  phone: "",
  days: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday: weekday as 1,
    enabled: weekday === 1,
    start: "08:00",
    end: "16:00",
  })),
}

describe("ProfileForm", () => {
  it("enables times only for working days", async () => {
    render(<ProfileForm defaultValues={defaults} onSave={vi.fn()} />)

    expect(screen.getByLabelText("Od (Poniedziałek)")).toBeEnabled()
    expect(screen.getByLabelText("Od (Wtorek)")).toBeDisabled()

    await userEvent.click(screen.getByRole("checkbox", { name: "Wtorek" }))
    expect(screen.getByLabelText("Od (Wtorek)")).toBeEnabled()
  })

  it("submits the week and confirms", async () => {
    const onSave = vi.fn().mockResolvedValue({ saved: true })
    render(<ProfileForm defaultValues={defaults} onSave={onSave} />)

    await userEvent.type(screen.getByLabelText("Telefon"), "600 100 200")
    await userEvent.click(screen.getByRole("checkbox", { name: "Piątek" }))
    await userEvent.clear(screen.getByLabelText("Do (Piątek)"))
    await userEvent.type(screen.getByLabelText("Do (Piątek)"), "14:30")
    await userEvent.click(screen.getByRole("button", { name: "Zapisz zmiany" }))

    expect(await screen.findByText("Zapisano zmiany.")).toBeInTheDocument()
    const sent = onSave.mock.lastCall?.[0] as ProfileInput
    expect(sent.phone).toBe("600 100 200")
    expect(sent.days[4]).toEqual({
      weekday: 5,
      enabled: true,
      start: "08:00",
      end: "14:30",
    })
  })

  it("shows translated errors next to the field", async () => {
    const onSave = vi.fn()
    render(<ProfileForm defaultValues={defaults} onSave={onSave} />)

    await userEvent.type(screen.getByLabelText("Telefon"), "123")
    await userEvent.clear(screen.getByLabelText("Do (Poniedziałek)"))
    await userEvent.type(screen.getByLabelText("Do (Poniedziałek)"), "07:00")
    await userEvent.click(screen.getByRole("button", { name: "Zapisz zmiany" }))

    expect(onSave).not.toHaveBeenCalled()
    expect(
      await screen.findByText("Nieprawidłowy numer telefonu")
    ).toBeInTheDocument()
    const monday = screen.getByTestId("day-1")
    expect(
      within(monday).getByText("Koniec musi być później niż początek")
    ).toBeInTheDocument()
  })
})

describe("ChangePasswordForm", () => {
  async function fill(current = "Stare#Haslo1") {
    await userEvent.type(screen.getByLabelText(/Obecne hasło/), current)
    await userEvent.type(screen.getByLabelText(/^Nowe hasło/), "Nowe#Haslo1")
    await userEvent.type(
      screen.getByLabelText(/Powtórz nowe hasło/),
      "Nowe#Haslo1"
    )
    await userEvent.click(screen.getByRole("button", { name: "Zmień hasło" }))
  }

  it("confirms and clears the fields after a change", async () => {
    const onChange = vi.fn().mockResolvedValue({ changed: true })
    render(<ChangePasswordForm onChange={onChange} />)
    await fill()

    expect(onChange).toHaveBeenCalledWith({
      currentPassword: "Stare#Haslo1",
      newPassword: "Nowe#Haslo1",
      confirmPassword: "Nowe#Haslo1",
    })
    expect(
      await screen.findByText(/Hasło zostało zmienione/)
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Obecne hasło/)).toHaveValue("")
  })

  it("translates the wrong-current-password key from the server", async () => {
    const onChange = vi.fn().mockResolvedValue({
      fieldErrors: { currentPassword: "validation.password.currentInvalid" },
    })
    render(<ChangePasswordForm onChange={onChange} />)
    await fill()

    expect(
      await screen.findByText("Obecne hasło jest nieprawidłowe")
    ).toBeInTheDocument()
  })
})
