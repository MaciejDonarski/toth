import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@toth/ui/components/combobox"

const frameworks = ["Next.js", "Remix", "Astro", "Vite"]

function Example() {
  return (
    <Combobox items={frameworks}>
      <ComboboxInput placeholder="Select framework" />
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

describe("Combobox", () => {
  it("renders a combobox input", () => {
    render(<Example />)
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "placeholder",
      "Select framework"
    )
  })

  it("filters options while typing and selects one", async () => {
    const user = userEvent.setup()
    render(<Example />)
    const input = screen.getByRole("combobox")
    await user.type(input, "rem")

    const options = await screen.findAllByRole("option")
    expect(options).toHaveLength(1)
    await user.click(options[0]!)
    expect(input).toHaveValue("Remix")
  })

  it("shows the empty state", async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.type(screen.getByRole("combobox"), "zzz")
    expect(await screen.findByText("No items found.")).toBeInTheDocument()
  })
})
