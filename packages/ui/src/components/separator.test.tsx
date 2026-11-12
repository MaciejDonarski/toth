import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Separator } from "@toth/ui/components/separator"

describe("Separator", () => {
  it("renders horizontal separator by default", () => {
    render(<Separator />)
    expect(screen.getByRole("separator")).toHaveAttribute(
      "aria-orientation",
      "horizontal"
    )
  })

  it("renders vertical separator", () => {
    render(<Separator orientation="vertical" />)
    expect(screen.getByRole("separator")).toHaveAttribute(
      "aria-orientation",
      "vertical"
    )
  })
})
