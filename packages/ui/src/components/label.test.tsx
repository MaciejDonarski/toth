import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Label } from "@toth/ui/components/label"

describe("Label", () => {
  it("labels a form control", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>
    )
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByText("Email")).toHaveAttribute("data-slot", "label")
  })
})
