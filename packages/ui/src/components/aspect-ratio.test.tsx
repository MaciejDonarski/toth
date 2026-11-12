import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AspectRatio } from "@toth/ui/components/aspect-ratio"

describe("AspectRatio", () => {
  it("exposes the ratio as a CSS variable and renders children", () => {
    render(
      <AspectRatio ratio={16 / 9} data-testid="ratio">
        <span>content</span>
      </AspectRatio>
    )
    const el = screen.getByTestId("ratio")
    expect(el).toHaveAttribute("data-slot", "aspect-ratio")
    expect(el.getAttribute("style")).toContain(String(16 / 9))
    expect(screen.getByText("content")).toBeInTheDocument()
  })
})
