import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@toth/ui/components/input-otp"

describe("InputOTP", () => {
  it("renders slots and accepts a code", async () => {
    const onComplete = vi.fn()
    const { container } = render(
      <InputOTP maxLength={4} onComplete={onComplete} aria-label="Code">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    )
    expect(
      container.querySelectorAll("[data-slot=input-otp-slot]")
    ).toHaveLength(4)
    expect(screen.getByRole("separator")).toBeInTheDocument()

    const input = screen.getByRole("textbox")
    await userEvent.type(input, "1234")
    expect(input).toHaveValue("1234")
    expect(onComplete).toHaveBeenCalledWith("1234")
  })
})
