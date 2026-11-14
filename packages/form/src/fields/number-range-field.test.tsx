import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { FormItem } from "../form-item"
import { renderInForm } from "../../test/render-in-form"

describe("number-range", () => {
  it("is a labelled group of two number inputs", () => {
    renderInForm(<FormItem name="qty" type="number-range" label="Quantity" />)
    expect(screen.getByRole("group", { name: "Quantity" })).toBeInTheDocument()
    expect(screen.getByLabelText("From")).toHaveAttribute("type", "number")
    expect(screen.getByLabelText("To")).toHaveAttribute("type", "number")
  })

  it("submits { from, to } with null for an empty end", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <FormItem name="qty" type="number-range" label="Quantity" />
    )
    await user.type(screen.getByLabelText("From"), "5")
    expect(await submit()).toEqual({ qty: { from: 5, to: null } })

    await user.type(screen.getByLabelText("To"), "12")
    await user.clear(screen.getByLabelText("From"))
    expect(await submit()).toEqual({ qty: { from: null, to: 12 } })
  })

  it("shows the default value", () => {
    renderInForm(<FormItem name="qty" type="number-range" label="Quantity" />, {
      qty: { from: 1, to: 9 },
    })
    expect(screen.getByLabelText("From")).toHaveValue(1)
    expect(screen.getByLabelText("To")).toHaveValue(9)
  })
})
