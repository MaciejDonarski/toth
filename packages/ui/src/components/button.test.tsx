import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Button, buttonVariants } from "@toth/ui/components/button"

describe("Button", () => {
  it("renders an accessible button and handles clicks", async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toHaveAttribute("data-slot", "button")
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("does not fire clicks when disabled", async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    )
    await userEvent.click(screen.getByRole("button"))
    expect(onClick).not.toHaveBeenCalled()
  })

  it("applies variant and size classes", () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>
    )
    expect(screen.getByRole("button")).toHaveClass("text-destructive", "h-8")
    expect(buttonVariants({ variant: "outline" })).toContain("border-border")
  })
})
