import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@toth/ui/components/message"

describe("Message", () => {
  it("renders all slots with alignment", () => {
    render(
      <MessageGroup>
        <Message align="end" data-testid="message">
          <MessageAvatar>JD</MessageAvatar>
          <MessageContent>
            <MessageHeader>Jane · 10:00</MessageHeader>
            Hello!
            <MessageFooter>Read</MessageFooter>
          </MessageContent>
        </Message>
      </MessageGroup>
    )
    expect(screen.getByTestId("message")).toHaveAttribute("data-align", "end")
    expect(screen.getByText("Hello!")).toBeInTheDocument()
    expect(screen.getByText("Jane · 10:00")).toBeInTheDocument()
    expect(screen.getByText("Read")).toBeInTheDocument()
  })
})
