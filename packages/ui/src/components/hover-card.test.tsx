import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@toth/ui/components/hover-card"

describe("HoverCard", () => {
  it("shows content when the trigger is hovered", async () => {
    render(
      <HoverCard>
        <HoverCardTrigger href="#" delay={0}>
          @nextjs
        </HoverCardTrigger>
        <HoverCardContent>The React Framework</HoverCardContent>
      </HoverCard>
    )
    expect(screen.queryByText("The React Framework")).not.toBeInTheDocument()
    await userEvent.hover(screen.getByText("@nextjs"))
    expect(await screen.findByText("The React Framework")).toBeInTheDocument()
  })
})
