import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@toth/ui/components/tooltip"

describe("Tooltip", () => {
  it("shows on hover", async () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Add to library</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.queryByText("Add to library")).not.toBeInTheDocument()
    await userEvent.hover(screen.getByRole("button", { name: "Hover me" }))
    expect(await screen.findByText("Add to library")).toBeInTheDocument()
  })
})
