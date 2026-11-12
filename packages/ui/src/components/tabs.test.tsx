import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@toth/ui/components/tabs"

function Example({ variant }: { variant?: "default" | "line" }) {
  return (
    <Tabs defaultValue="account">
      <TabsList variant={variant}>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account settings</TabsContent>
      <TabsContent value="password">Password settings</TabsContent>
    </Tabs>
  )
}

describe("Tabs", () => {
  it("shows the default tab and switches on click", async () => {
    render(<Example />)
    expect(screen.getByRole("tab", { name: "Account" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Account settings")

    await userEvent.click(screen.getByRole("tab", { name: "Password" }))
    expect(screen.getByRole("tab", { name: "Password" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Password settings")
  })

  it("supports the line variant", () => {
    render(<Example variant="line" />)
    expect(screen.getByRole("tablist")).toHaveAttribute("data-variant", "line")
  })
})
