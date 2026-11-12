import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@toth/ui/components/message-scroller"

describe("MessageScroller", () => {
  it("renders messages inside the scrollable viewport", () => {
    render(
      <MessageScrollerProvider>
        <MessageScroller data-testid="scroller">
          <MessageScrollerViewport>
            <MessageScrollerContent>
              <MessageScrollerItem>First message</MessageScrollerItem>
              <MessageScrollerItem scrollAnchor>
                Second message
              </MessageScrollerItem>
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
    )
    expect(screen.getByTestId("scroller")).toHaveAttribute(
      "data-slot",
      "message-scroller"
    )
    expect(screen.getByText("First message")).toBeInTheDocument()
    expect(screen.getByText("Second message")).toBeInTheDocument()
    expect(screen.getByText("Scroll to end")).toBeInTheDocument()
  })
})
