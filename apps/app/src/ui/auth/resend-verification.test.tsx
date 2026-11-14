import { act, render, screen } from "@test/render"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ResendVerification } from "./resend-verification"

describe("ResendVerification", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts in cooldown and unlocks after 60 seconds", async () => {
    render(<ResendVerification onResend={vi.fn()} startInCooldown />)

    expect(screen.getByRole("button")).toHaveTextContent(
      "Wyślij ponownie za 1:00"
    )
    expect(screen.getByRole("button")).toBeDisabled()

    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(
      screen.getByRole("button", { name: "Wyślij link ponownie" })
    ).toBeEnabled()
  })

  it("resends and confirms without revealing the account", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onResend = vi.fn().mockResolvedValue({ ok: true })
    render(<ResendVerification onResend={onResend} />)

    await user.click(
      screen.getByRole("button", { name: "Wyślij link ponownie" })
    )

    expect(onResend).toHaveBeenCalledWith(undefined)
    expect(
      await screen.findByText(/Jeśli konto czeka na potwierdzenie/)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Wyślij ponownie za/ })
    ).toBeDisabled()
  })

  it("asks for the email when none is remembered", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onResend = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "Zbyt wiele prób." })
    render(<ResendVerification onResend={onResend} askForEmail />)

    await user.type(screen.getByLabelText("Email"), "jan@firma.pl")
    await user.click(
      screen.getByRole("button", { name: "Wyślij link ponownie" })
    )

    expect(onResend).toHaveBeenCalledWith("jan@firma.pl")
    expect(await screen.findByText("Zbyt wiele prób.")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Wyślij link ponownie" })
    ).toBeEnabled()
  })
})
