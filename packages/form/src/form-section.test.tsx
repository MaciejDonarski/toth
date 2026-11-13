import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { Form } from "./form"
import { FormItem } from "./form-item"
import { FormSection } from "./form-section"
import type { FormItemConfig } from "./types"

const items: FormItemConfig[] = [
  { name: "first", type: "text", label: "First", colSpan: { md: 6 } },
  { name: "last", type: "text", label: "Last", colSpan: { md: 6 } },
]

function renderSection(node: React.ReactNode) {
  return render(
    <Form schema={z.object({})} onSubmit={() => {}}>
      {node}
    </Form>
  )
}

describe("FormSection", () => {
  it("renders items in a 12-column grid", () => {
    renderSection(<FormSection items={items} />)
    const first = screen.getByLabelText("First")
    const grid = first.closest("[data-slot=form-section-grid]")
    expect(grid).toHaveClass("grid-cols-12")
    expect(first.closest("[data-slot=field]")).toHaveClass(
      "col-span-12",
      "md:col-span-6"
    )
    expect(screen.getByLabelText("Last")).toBeInTheDocument()
  })

  it("renders children after items in the same grid", () => {
    renderSection(
      <FormSection items={items}>
        <FormItem name="extra" type="text" label="Extra" />
      </FormSection>
    )
    const grid = screen
      .getByLabelText("First")
      .closest("[data-slot=form-section-grid]")
    expect(grid).toContainElement(screen.getByLabelText("Extra"))
  })

  it("plain variant renders a header without a card", () => {
    renderSection(
      <FormSection title="Profile" description="Basic info" items={items} />
    )
    expect(
      screen.getByRole("heading", { level: 3, name: "Profile" })
    ).toBeInTheDocument()
    expect(screen.getByText("Basic info")).toBeInTheDocument()
    expect(document.querySelector("[data-slot=card]")).toBeNull()
  })

  it("card variant wraps the section in a Card", () => {
    renderSection(
      <FormSection
        card
        title="Profile"
        description="Basic info"
        items={items}
      />
    )
    const card = document.querySelector("[data-slot=card]")
    expect(card).not.toBeNull()
    expect(
      screen.getByRole("heading", { level: 3, name: "Profile" })
    ).toHaveAttribute("data-slot", "card-title")
    expect(card).toContainElement(screen.getByLabelText("First"))
  })
})
