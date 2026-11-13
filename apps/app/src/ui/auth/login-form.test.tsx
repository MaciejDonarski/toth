import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LoginForm } from "./login-form"

describe("LoginForm", () => {
  it("renders labelled email and password fields", () => {
    render(<LoginForm onLogin={vi.fn()} />)
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    expect(screen.getByLabelText("Hasło")).toHaveAttribute("type", "password")
    expect(screen.getByRole("button", { name: "Zaloguj" })).toHaveAttribute(
      "type",
      "submit"
    )
  })

  it("submits normalized credentials", async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockResolvedValue(undefined)
    render(<LoginForm onLogin={onLogin} />)

    await user.type(screen.getByLabelText("Email"), " Jan@Firma.pl ")
    await user.type(screen.getByLabelText("Hasło"), "Zaq1@wsx")
    await user.click(screen.getByRole("button", { name: "Zaloguj" }))

    expect(onLogin).toHaveBeenCalledWith({
      email: "jan@firma.pl",
      password: "Zaq1@wsx",
    })
  })

  it("shows a generic error and the resend link for unverified accounts", async () => {
    const user = userEvent.setup()
    const onLogin = vi
      .fn()
      .mockResolvedValueOnce({ formError: "Nieprawidłowy email lub hasło." })
      .mockResolvedValueOnce({
        formError: "Najpierw potwierdź adres email.",
        unverified: true,
      })
    render(<LoginForm onLogin={onLogin} />)

    await user.type(screen.getByLabelText("Email"), "jan@firma.pl")
    await user.type(screen.getByLabelText("Hasło"), "x")
    await user.click(screen.getByRole("button", { name: "Zaloguj" }))
    expect(
      await screen.findByText("Nieprawidłowy email lub hasło.")
    ).toBeInTheDocument()
    expect(
      screen.queryByText("Wyślij link aktywacyjny ponownie")
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Zaloguj" }))
    expect(
      await screen.findByRole("link", {
        name: "Wyślij link aktywacyjny ponownie",
      })
    ).toHaveAttribute("href", "/register/check-email")
  })
})
