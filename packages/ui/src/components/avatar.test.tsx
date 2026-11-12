import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@toth/ui/components/avatar"

describe("Avatar", () => {
  it("shows the fallback when the image has not loaded", () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/a.png" alt="Jane" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    // jsdom never loads images, so the fallback is displayed
    expect(screen.getByText("JD")).toBeInTheDocument()
  })

  it("supports size, badge and groups", () => {
    render(
      <AvatarGroup data-testid="group">
        <Avatar size="lg" data-testid="avatar">
          <AvatarFallback>AB</AvatarFallback>
          <AvatarBadge data-testid="badge" />
        </Avatar>
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>
    )
    expect(screen.getByTestId("avatar")).toHaveAttribute("data-size", "lg")
    expect(screen.getByTestId("badge")).toHaveAttribute(
      "data-slot",
      "avatar-badge"
    )
    expect(screen.getByText("+3")).toBeInTheDocument()
  })
})
