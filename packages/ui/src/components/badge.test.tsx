import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Badge, badgeVariants } from "@toth/ui/components/badge"

describe("Badge", () => {
  it("renders a span with default variant", () => {
    render(<Badge>New</Badge>)
    const badge = screen.getByText("New")
    expect(badge.tagName).toBe("SPAN")
    expect(badge).toHaveClass("bg-primary")
  })

  it("supports variants and custom render element", () => {
    render(
      <Badge variant="outline" render={<a href="/docs" />}>
        Docs
      </Badge>
    )
    const link = screen.getByRole("link", { name: "Docs" })
    expect(link).toHaveAttribute("href", "/docs")
    expect(badgeVariants({ variant: "destructive" })).toContain("destructive")
  })
})
