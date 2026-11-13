import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@toth/ui/components/collapsible"

describe("Collapsible", () => {
  it("toggles content visibility", async () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden content</CollapsibleContent>
      </Collapsible>
    )
    const trigger = screen.getByRole("button", { name: "Toggle" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument()

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Hidden content")).toBeInTheDocument()
  })
})
