import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@toth/ui/components/card"

describe("Card", () => {
  it("renders all slots", () => {
    render(
      <Card data-testid="card" size="sm">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(screen.getByTestId("card")).toHaveAttribute("data-size", "sm")
    for (const text of ["Title", "Description", "Action", "Body", "Footer"]) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
    expect(screen.getByText("Title")).toHaveAttribute("data-slot", "card-title")
  })
})
