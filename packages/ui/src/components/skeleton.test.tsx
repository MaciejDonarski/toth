import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Skeleton } from "@toth/ui/components/skeleton"

describe("Skeleton", () => {
  it("renders a pulsing placeholder", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-20" />)
    const el = screen.getByTestId("skeleton")
    expect(el).toHaveClass("animate-pulse", "h-4", "w-20")
  })
})
