import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@toth/ui/components/alert"

describe("Alert", () => {
  it("renders with role alert, title, description and action", () => {
    render(
      <Alert>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>You can add components.</AlertDescription>
        <AlertAction>
          <button type="button">Undo</button>
        </AlertAction>
      </Alert>
    )
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Heads up!")
    expect(alert).toHaveTextContent("You can add components.")
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument()
  })

  it("applies the destructive variant", () => {
    render(<Alert variant="destructive">Error</Alert>)
    expect(screen.getByRole("alert")).toHaveClass("text-destructive")
  })
})
