import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@toth/ui/components/accordion"

function Example() {
  return (
    <Accordion>
      <AccordionItem value="a">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>Yes, with the preset.</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

describe("Accordion", () => {
  it("renders collapsed triggers", () => {
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Is it accessible?" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Yes.")).not.toBeInTheDocument()
  })

  it("expands an item on click", async () => {
    render(<Example />)
    const trigger = screen.getByRole("button", { name: "Is it accessible?" })
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Yes.")).toBeVisible()
  })
})
