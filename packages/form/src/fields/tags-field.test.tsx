import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { FormItem } from "../form-item"
import { renderInForm } from "../../test/render-in-form"

describe("tags", () => {
  it("adds on Enter and comma, ignores blanks and duplicates", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <FormItem name="sku" type="tags" label="SKU" />
    )
    const input = screen.getByLabelText("SKU")
    await user.type(input, "A1{Enter}B2,  {Enter}A1{Enter}")
    expect(screen.getByText("A1")).toBeInTheDocument()
    expect(screen.getByText("B2")).toBeInTheDocument()
    expect(await submit()).toEqual({ sku: ["A1", "B2"] })
  })

  it("Backspace in an empty input removes the last tag", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <FormItem name="sku" type="tags" label="SKU" />,
      { sku: ["A1", "B2"] }
    )
    await user.click(screen.getByLabelText("SKU"))
    await user.keyboard("{Backspace}")
    expect(await submit()).toEqual({ sku: ["A1"] })
  })

  it("removes a tag with its button", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <FormItem name="sku" type="tags" label="SKU" />,
      { sku: ["A1", "B2"] }
    )
    await user.click(screen.getByRole("button", { name: "Remove A1" }))
    expect(await submit()).toEqual({ sku: ["B2"] })
  })

  it("adds the draft on blur", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <FormItem name="sku" type="tags" label="SKU" />
    )
    await user.type(screen.getByLabelText("SKU"), "C3")
    await user.tab()
    expect(await submit()).toEqual({ sku: ["C3"] })
  })
})
