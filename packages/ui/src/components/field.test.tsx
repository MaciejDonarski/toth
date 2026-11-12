import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@toth/ui/components/field"
import { Input } from "@toth/ui/components/input"

describe("Field", () => {
  it("associates label and description with the control", () => {
    render(
      <FieldSet>
        <FieldLegend>Profile</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" aria-describedby="name-desc" />
            <FieldDescription id="name-desc">Your full name.</FieldDescription>
          </Field>
          <FieldSeparator>or</FieldSeparator>
        </FieldGroup>
      </FieldSet>
    )
    expect(screen.getByRole("group", { name: "Profile" })).toBeInTheDocument()
    const input = screen.getByLabelText("Name")
    expect(input).toHaveAccessibleDescription("Your full name.")
    expect(screen.getByText("or")).toBeInTheDocument()
  })

  it("supports orientation", () => {
    render(
      <Field orientation="horizontal" data-testid="field">
        <FieldContent>content</FieldContent>
      </Field>
    )
    expect(screen.getByTestId("field")).toHaveAttribute(
      "data-orientation",
      "horizontal"
    )
  })

  it("renders errors and de-duplicates messages", () => {
    render(
      <FieldError
        errors={[
          { message: "Required" },
          { message: "Too short" },
          { message: "Required" },
        ]}
      />
    )
    const alert = screen.getByRole("alert")
    expect(alert.querySelectorAll("li")).toHaveLength(2)
  })

  it("renders nothing without errors", () => {
    const { container } = render(<FieldError errors={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
