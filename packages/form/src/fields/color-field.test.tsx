import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { FormItem } from "../form-item"
import { renderInForm } from "../../test/render-in-form"

const options = [
  { value: "red", label: "Red", color: "#fb2c36" },
  { value: "blue", label: "Blue", color: "#3080ff" },
]

describe("color", () => {
  it("selects a swatch and submits its value", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <FormItem name="color" type="color" label="Color" options={options} />,
      { color: "red" }
    )
    expect(screen.getByRole("radio", { name: "Red" })).toBeChecked()
    await user.click(screen.getByRole("radio", { name: "Blue" }))
    expect(await submit()).toEqual({ color: "blue" })
  })

  it("names the group by its label", () => {
    renderInForm(
      <FormItem name="color" type="color" label="Color" options={options} />,
      { color: "red" }
    )
    expect(
      screen.getByRole("radiogroup", { name: "Color" })
    ).toBeInTheDocument()
  })
})
