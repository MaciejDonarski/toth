import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@toth/ui/components/progress"

describe("Progress", () => {
  it("exposes the value through ARIA", () => {
    render(
      <Progress value={40}>
        <ProgressLabel>Upload</ProgressLabel>
        <ProgressValue />
      </Progress>
    )
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "40")
    expect(bar).toHaveAccessibleName("Upload")
    expect(screen.getByText("40%")).toBeInTheDocument()
  })
})
