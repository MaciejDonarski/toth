import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@toth/ui/components/trace"

describe("Trace", () => {
  it("renders steps with status", () => {
    render(
      <Trace>
        <TraceLine status="running" data-testid="line">
          <TraceIcon>●</TraceIcon>
          <TraceTitle>Reading files</TraceTitle>
          <TraceDescription>src/index.ts</TraceDescription>
        </TraceLine>
      </Trace>
    )
    expect(screen.getByTestId("line")).toHaveAttribute("data-status", "running")
    expect(screen.getByText("Reading files")).toBeInTheDocument()
    expect(screen.getByText("src/index.ts")).toBeInTheDocument()
  })

  it("expands collapsible details", async () => {
    render(
      <Trace>
        <TraceCollapsible>
          <TraceCollapsibleTrigger>Ran 3 commands</TraceCollapsibleTrigger>
          <TraceCollapsibleContent>pnpm test</TraceCollapsibleContent>
        </TraceCollapsible>
      </Trace>
    )
    const trigger = screen.getByRole("button", { name: /ran 3 commands/i })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("pnpm test")).toBeInTheDocument()
  })
})
