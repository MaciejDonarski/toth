import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@toth/ui/components/empty"

describe("Empty", () => {
  it("renders all slots", () => {
    render(
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon" data-testid="media">
            📁
          </EmptyMedia>
          <EmptyTitle>No projects</EmptyTitle>
          <EmptyDescription>Create your first project.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <button type="button">Create</button>
        </EmptyContent>
      </Empty>
    )
    expect(screen.getByTestId("media")).toHaveAttribute("data-variant", "icon")
    expect(screen.getByText("No projects")).toBeInTheDocument()
    expect(screen.getByText("Create your first project.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument()
  })
})
