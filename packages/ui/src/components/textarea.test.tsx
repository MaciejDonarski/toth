import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Textarea } from "@toth/ui/components/textarea"

describe("Textarea", () => {
  it("accepts multi-line input", async () => {
    render(<Textarea aria-label="Message" />)
    const textarea = screen.getByRole("textbox", { name: "Message" })
    expect(textarea.tagName).toBe("TEXTAREA")
    await userEvent.type(textarea, "line 1{enter}line 2")
    expect(textarea).toHaveValue("line 1\nline 2")
  })

  it("can be disabled", () => {
    render(<Textarea aria-label="Message" disabled />)
    expect(screen.getByRole("textbox")).toBeDisabled()
  })
})
