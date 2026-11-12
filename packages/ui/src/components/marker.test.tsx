import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Marker,
  MarkerContent,
  MarkerIcon,
  markerVariants,
} from "@toth/ui/components/marker"

describe("Marker", () => {
  it("renders icon and content", () => {
    render(
      <Marker data-testid="marker">
        <MarkerIcon>●</MarkerIcon>
        <MarkerContent>Today</MarkerContent>
      </Marker>
    )
    expect(screen.getByText("Today")).toBeInTheDocument()
    expect(screen.getByText("●")).toHaveAttribute("aria-hidden", "true")
  })

  it("supports variants and custom elements", () => {
    render(
      <Marker variant="border" render={<h3 />}>
        Section
      </Marker>
    )
    const heading = screen.getByRole("heading", { name: "Section" })
    expect(heading).toHaveClass("border-b")
    expect(markerVariants({ variant: "border" })).toContain("border-b")
  })
})
