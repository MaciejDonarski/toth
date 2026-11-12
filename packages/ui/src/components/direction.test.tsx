import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DirectionProvider, useDirection } from "@toth/ui/components/direction"

function ShowDirection() {
  return <span>{useDirection()}</span>
}

describe("DirectionProvider", () => {
  it("defaults to ltr", () => {
    render(<ShowDirection />)
    expect(screen.getByText("ltr")).toBeInTheDocument()
  })

  it("provides rtl to descendants", () => {
    render(
      <DirectionProvider direction="rtl">
        <ShowDirection />
      </DirectionProvider>
    )
    expect(screen.getByText("rtl")).toBeInTheDocument()
  })
})
