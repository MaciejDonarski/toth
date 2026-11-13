import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@toth/ui/components/resizable"

describe("Resizable", () => {
  it("renders panels separated by a handle", () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={50}>One</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>Two</ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByText("One")).toBeInTheDocument()
    expect(screen.getByText("Two")).toBeInTheDocument()
    expect(screen.getByRole("separator")).toBeInTheDocument()
    expect(
      container.querySelector("[data-slot=resizable-panel-group]")
    ).toBeInTheDocument()
  })
})
