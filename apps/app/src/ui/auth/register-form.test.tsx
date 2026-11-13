import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RegisterForm } from "./register-form"

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Nazwa firmy/), "Acme")
  await user.type(screen.getByLabelText(/^Email/), "jan@firma.pl")
  await user.type(screen.getByLabelText(/^Hasło/), "Zaq1@wsx")
  await user.type(screen.getByLabelText(/Powtórz hasło/), "Zaq1@wsx")
  await user.click(
    screen.getByRole("checkbox", { name: /Akceptuję regulamin/ })
  )
}

describe("RegisterForm", () => {
  it("submits normalized values", async () => {
    const user = userEvent.setup()
    const onRegister = vi.fn().mockResolvedValue(undefined)
    render(<RegisterForm onRegister={onRegister} />)

    await fillValid(user)
    await user.click(screen.getByRole("button", { name: "Zarejestruj" }))

    expect(onRegister).toHaveBeenCalledWith({
      companyName: "Acme",
      email: "jan@firma.pl",
      password: "Zaq1@wsx",
      confirmPassword: "Zaq1@wsx",
      acceptTerms: true,
    })
  })

  it("blocks submit until terms are accepted and passwords match", async () => {
    const user = userEvent.setup()
    const onRegister = vi.fn()
    render(<RegisterForm onRegister={onRegister} />)

    await user.type(screen.getByLabelText(/Nazwa firmy/), "Acme")
    await user.type(screen.getByLabelText(/^Email/), "jan@firma.pl")
    await user.type(screen.getByLabelText(/^Hasło/), "Zaq1@wsx")
    await user.type(screen.getByLabelText(/Powtórz hasło/), "Zaq1@wsy")
    await user.click(screen.getByRole("button", { name: "Zarejestruj" }))

    expect(onRegister).not.toHaveBeenCalled()
    expect(
      await screen.findByText("Hasła nie są identyczne")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Musisz zaakceptować regulamin")
    ).toBeInTheDocument()
  })

  it("shows the live password checklist", async () => {
    const user = userEvent.setup()
    render(<RegisterForm onRegister={vi.fn()} />)
    const list = screen.getByRole("list", { name: "Wymagania hasła" })
    const rule = (name: RegExp) =>
      within(list).getByText(name).closest("li") as HTMLElement

    expect(rule(/Wielka litera/)).toHaveAttribute("data-met", "false")
    await user.type(screen.getByLabelText(/^Hasło/), "A1")
    expect(rule(/Wielka litera/)).toHaveAttribute("data-met", "true")
    expect(rule(/Cyfra/)).toHaveAttribute("data-met", "true")
    expect(rule(/Znak specjalny/)).toHaveAttribute("data-met", "false")
  })

  it("shows server-side errors", async () => {
    const user = userEvent.setup()
    const onRegister = vi
      .fn()
      .mockResolvedValue({ formError: "Zbyt wiele prób." })
    render(<RegisterForm onRegister={onRegister} />)

    await fillValid(user)
    await user.click(screen.getByRole("button", { name: "Zarejestruj" }))

    expect(await screen.findByText("Zbyt wiele prób.")).toBeInTheDocument()
  })
})
