import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ScrollArea, ScrollBar } from "@toth/ui/components/scroll-area"

describe("ScrollArea", () => {
  it("renders content inside a viewport", () => {
    const { container } = render(
      <ScrollArea className="h-20 w-40">
        {Array.from({ length: 20 }, (_, i) => (
          <p key={i}>Tag {i}</p>
        ))}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    )
    expect(
      container.querySelector("[data-slot=scroll-area]")
    ).toBeInTheDocument()
    expect(
      container.querySelector("[data-slot=scroll-area-viewport]")
    ).toBeInTheDocument()
    expect(screen.getByText("Tag 19")).toBeInTheDocument()
  })
})
