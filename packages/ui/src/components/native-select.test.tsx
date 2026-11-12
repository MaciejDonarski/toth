import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@toth/ui/components/native-select"

describe("NativeSelect", () => {
  it("selects an option", async () => {
    render(
      <NativeSelect aria-label="Fruit" defaultValue="">
        <NativeSelectOption value="">Select</NativeSelectOption>
        <NativeSelectOptGroup label="Fruits">
          <NativeSelectOption value="apple">Apple</NativeSelectOption>
          <NativeSelectOption value="pear">Pear</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
    )
    const select = screen.getByRole("combobox", { name: "Fruit" })
    await userEvent.selectOptions(select, "pear")
    expect(select).toHaveValue("pear")
  })

  it("supports small size and disabled", () => {
    render(<NativeSelect aria-label="Size" size="sm" disabled />)
    const select = screen.getByRole("combobox", { name: "Size" })
    expect(select).toBeDisabled()
    expect(select).toHaveAttribute("data-size", "sm")
  })
})
