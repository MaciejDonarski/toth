import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { VerifyCodeForm, type VerifyCodeFormProps } from "./verify-code-form"

const NOW = new Date("2026-11-13T10:00:00Z").getTime()

function renderForm(overrides: Partial<VerifyCodeFormProps> = {}) {
  const props: VerifyCodeFormProps = {
    maskedEmail: "j***@firma.pl",
    codeExpiresAt: NOW + 180_000,
    nextResendAt: NOW + 60_000,
    resendsLeft: 5,
    onVerify: vi.fn().mockResolvedValue(undefined),
    onResend: vi.fn(),
    ...overrides,
  }
  render(<VerifyCodeForm {...props} />)
  return props
}

describe("VerifyCodeForm", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const otp = () => screen.getByRole("textbox", { name: "Kod weryfikacyjny" })

  it("shows the masked email and a 3:00 countdown", () => {
    renderForm()
    expect(screen.getByText("j***@firma.pl")).toBeInTheDocument()
    expect(screen.getByTestId("code-timer")).toHaveTextContent("3:00")
    expect(
      screen.getByRole("button", { name: /Wyślij kod ponownie za 1:00/ })
    ).toBeDisabled()
  })

  it("submits the code with the remember choice once 6 digits are typed", async () => {
    const props = renderForm()
    await user().click(
      screen.getByRole("checkbox", {
        name: /Zapamiętaj tę przeglądarkę na 30 dni/,
      })
    )
    await user().type(otp(), "123456")

    expect(props.onVerify).toHaveBeenCalledWith({
      code: "123456",
      remember: true,
    })
  })

  it("disables entry when the code expires and allows a resend", async () => {
    const onResend = vi.fn().mockResolvedValue({
      ok: true,
      codeExpiresAt: NOW + 400_000,
      nextResendAt: NOW + 300_000,
      resendsLeft: 4,
    })
    renderForm({ onResend })

    await act(() => vi.advanceTimersByTimeAsync(180_000))
    expect(screen.getByTestId("code-timer")).toHaveTextContent("Kod wygasł")
    expect(otp()).toBeDisabled()

    await user().click(
      screen.getByRole("button", { name: "Wyślij kod ponownie" })
    )
    expect(await screen.findByText(/Wysłaliśmy nowy kod/)).toBeInTheDocument()
    expect(otp()).toBeEnabled()
    expect(screen.getByTestId("code-timer")).toHaveTextContent(
      "Kod jest ważny jeszcze"
    )
  })

  it("shows errors and clears the input after a wrong code", async () => {
    const onVerify = vi
      .fn()
      .mockResolvedValue({ error: "Nieprawidłowy kod. Pozostało prób: 4." })
    renderForm({ onVerify })

    await user().type(otp(), "000000")
    expect(
      await screen.findByText("Nieprawidłowy kod. Pozostało prób: 4.")
    ).toBeInTheDocument()
    expect(otp()).toHaveValue("")
  })

  it("sends the user back to login when the challenge is gone", async () => {
    const onVerify = vi
      .fn()
      .mockResolvedValue({ error: "Zaloguj się ponownie.", restart: true })
    renderForm({ onVerify })

    await user().type(otp(), "000000")
    // Base UI Button with nativeButton={false} renders <a role="button">.
    expect(
      await screen.findByRole("button", { name: "Wróć do logowania" })
    ).toHaveAttribute("href", "/login")
  })

  it("disables resend once the limit is used up", () => {
    renderForm({ resendsLeft: 0, nextResendAt: NOW })
    expect(
      screen.getByRole("button", {
        name: "Limit ponownych wysyłek wykorzystany",
      })
    ).toBeDisabled()
  })
})
