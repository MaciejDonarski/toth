import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { LoginForm } from "./login-form"

describe("LoginForm", () => {
  it("renders labelled email and password fields", () => {
    render(<LoginForm />)
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    expect(screen.getByLabelText("Hasło")).toHaveAttribute("type", "password")
    expect(screen.getByRole("button", { name: "Zaloguj" })).toHaveAttribute(
      "type",
      "submit"
    )
  })
})
