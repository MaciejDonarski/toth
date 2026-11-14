import { render, screen } from "@test/render"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ForgotPasswordForm } from "./forgot-password-form"
import { ResetPasswordForm } from "./reset-password-form"

describe("ForgotPasswordForm", () => {
  it("shows the same confirmation for any accepted request", async () => {
    const user = userEvent.setup()
    const onRequest = vi.fn().mockResolvedValue({ sent: true })
    render(<ForgotPasswordForm onRequest={onRequest} />)

    await user.type(screen.getByLabelText("Email"), " Jan@Firma.pl")
    await user.click(screen.getByRole("button", { name: "Wyślij link" }))

    expect(onRequest).toHaveBeenCalledWith({ email: "jan@firma.pl" })
    expect(
      await screen.findByText(/Jeśli konto z tym adresem istnieje/)
    ).toBeInTheDocument()
    expect(screen.getByText(/ważny 30 minut/)).toBeInTheDocument()
  })

  it("shows rate-limit errors", async () => {
    const user = userEvent.setup()
    const onRequest = vi
      .fn()
      .mockResolvedValue({ formError: "Zbyt wiele prób." })
    render(<ForgotPasswordForm onRequest={onRequest} />)

    await user.type(screen.getByLabelText("Email"), "jan@firma.pl")
    await user.click(screen.getByRole("button", { name: "Wyślij link" }))
    expect(await screen.findByText("Zbyt wiele prób.")).toBeInTheDocument()
  })
})

describe("ResetPasswordForm", () => {
  it("submits a valid new password", async () => {
    const user = userEvent.setup()
    const onReset = vi.fn().mockResolvedValue(undefined)
    render(<ResetPasswordForm onReset={onReset} />)

    await user.type(screen.getByLabelText(/^Nowe hasło/), "Nowe#Haslo1")
    await user.type(screen.getByLabelText(/Powtórz nowe hasło/), "Nowe#Haslo1")
    await user.click(screen.getByRole("button", { name: "Zmień hasło" }))

    expect(onReset).toHaveBeenCalledWith({
      password: "Nowe#Haslo1",
      confirmPassword: "Nowe#Haslo1",
    })
  })

  it("blocks weak or mismatched passwords", async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    render(<ResetPasswordForm onReset={onReset} />)

    await user.type(screen.getByLabelText(/^Nowe hasło/), "Nowe#Haslo1")
    await user.type(screen.getByLabelText(/Powtórz nowe hasło/), "Nowe#Haslo2")
    await user.click(screen.getByRole("button", { name: "Zmień hasło" }))

    expect(onReset).not.toHaveBeenCalled()
    expect(
      await screen.findByText("Hasła nie są identyczne")
    ).toBeInTheDocument()
  })

  it("switches to the 'request a new link' view when the link died", async () => {
    const user = userEvent.setup()
    const onReset = vi
      .fn()
      .mockResolvedValue({ formError: "x", invalidToken: true })
    render(<ResetPasswordForm onReset={onReset} />)

    await user.type(screen.getByLabelText(/^Nowe hasło/), "Nowe#Haslo1")
    await user.type(screen.getByLabelText(/Powtórz nowe hasło/), "Nowe#Haslo1")
    await user.click(screen.getByRole("button", { name: "Zmień hasło" }))

    expect(
      await screen.findByRole("button", { name: "Wyślij nowy link" })
    ).toHaveAttribute("href", "/forgot-password")
  })
})
