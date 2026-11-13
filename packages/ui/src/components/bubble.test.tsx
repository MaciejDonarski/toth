import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "@toth/ui/components/bubble"

describe("Bubble", () => {
  it("renders content with variant and alignment", () => {
    render(
      <BubbleGroup>
        <Bubble data-testid="bubble" variant="secondary" align="end">
          <BubbleContent>Hello there</BubbleContent>
          <BubbleReactions data-testid="reactions" side="top">
            👍
          </BubbleReactions>
        </Bubble>
      </BubbleGroup>
    )
    const bubble = screen.getByTestId("bubble")
    expect(bubble).toHaveAttribute("data-variant", "secondary")
    expect(bubble).toHaveAttribute("data-align", "end")
    expect(screen.getByText("Hello there")).toBeInTheDocument()
    expect(screen.getByTestId("reactions")).toHaveAttribute("data-side", "top")
  })

  it("renders content as a custom element", () => {
    render(
      <Bubble>
        <BubbleContent render={<p />}>Paragraph</BubbleContent>
      </Bubble>
    )
    expect(screen.getByText("Paragraph").tagName).toBe("P")
  })
})
