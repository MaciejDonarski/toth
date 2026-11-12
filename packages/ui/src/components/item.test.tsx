import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@toth/ui/components/item"

describe("Item", () => {
  it("renders all slots with variant and size", () => {
    render(
      <ItemGroup>
        <Item variant="outline" size="sm" data-testid="item">
          <ItemHeader>Header</ItemHeader>
          <ItemMedia variant="icon">★</ItemMedia>
          <ItemContent>
            <ItemTitle>Basic item</ItemTitle>
            <ItemDescription>A simple description.</ItemDescription>
          </ItemContent>
          <ItemActions>
            <button type="button">Action</button>
          </ItemActions>
          <ItemFooter>Footer</ItemFooter>
        </Item>
        <ItemSeparator />
      </ItemGroup>
    )
    const item = screen.getByTestId("item")
    expect(item).toHaveAttribute("data-variant", "outline")
    expect(item).toHaveAttribute("data-size", "sm")
    expect(screen.getByText("Basic item")).toBeInTheDocument()
    expect(screen.getByRole("list")).toBeInTheDocument()
  })

  it("can render as a link", () => {
    render(<Item render={<a href="/profile" />}>Profile</Item>)
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/profile"
    )
  })
})
