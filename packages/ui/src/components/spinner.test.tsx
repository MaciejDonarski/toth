import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Spinner } from "@toth/ui/components/spinner"

describe("Spinner", () => {
  it("renders an accessible loading indicator", () => {
    render(<Spinner />)
    const spinner = screen.getByRole("status", { name: "Loading" })
    expect(spinner).toHaveClass("animate-spin")
  })
})
