import { DataTableSearch } from "."
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

// The shape `DataTable` actually gives the box: `value` only ever changes because this component
// reported it (`onChange`), or because something else reset it — never a re-render of its own.
function Harness({ debounce = 20 }: { debounce?: number }) {
  const [value, setValue] = React.useState("")

  return (
    <div>
      <DataTableSearch value={value} onChange={setValue} debounce={debounce} />
      <button onClick={() => setValue("")}>Clear externally</button>
      {/* The term the parent holds, so a test can wait for the report to have LANDED. */}
      <output aria-label="Term in force">{value}</output>
    </div>
  )
}

describe("DataTableSearch", () => {
  // Regression: `handleChange` used to update its "last known term" state synchronously, ahead
  // of the debounced `onChange` telling the parent — so the very next render saw the box's own
  // term disagree with the still-stale `value` prop, read that as an EXTERNAL change, and reset
  // the draft to it. Every keystroke but the last landed inside the debounce window and was wiped
  // the instant it was typed.
  it("keeps every keystroke while the debounced commit is still pending", async () => {
    // Long enough that it cannot fire mid-test on a loaded CI box — this test is about the
    // commit being STILL PENDING throughout, not about racing its own timer.
    render(<Harness debounce={10_000} />)

    await userEvent.type(screen.getByRole("searchbox"), "hello world")

    expect(screen.getByRole("searchbox")).toHaveValue("hello world")
  })

  it("still follows the term when it is reset from outside", async () => {
    render(<Harness />)
    const input = screen.getByRole("searchbox")

    await userEvent.type(input, "hello")
    expect(input).toHaveValue("hello")

    // Until the typed term's own report has reached the parent and been committed, so the reset
    // below is not racing it — that race is what `report.cancel()` in the effect guards against,
    // not what this test is for. Waiting on the committed value rather than on a fixed sleep:
    // under load a sleep can end before the debounced update has rendered, and a reset from ''
    // to '' is then no change at all, so the box never hears about it.
    await vi.waitFor(() =>
      expect(
        screen.getByRole("status", { name: "Term in force" })
      ).toHaveTextContent("hello")
    )

    await userEvent.click(
      screen.getByRole("button", { name: "Clear externally" })
    )

    expect(input).toHaveValue("")
  })

  it("reports the term once the debounce settles", async () => {
    const onChange = vi.fn()
    render(<DataTableSearch value="" onChange={onChange} debounce={20} />)

    await userEvent.type(screen.getByRole("searchbox"), "sku-1")

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith("sku-1"))
  })

  describe("submitOnChange={false}", () => {
    it("does not report while typing", async () => {
      const onChange = vi.fn()
      render(
        <DataTableSearch value="" onChange={onChange} submitOnChange={false} />
      )

      await userEvent.type(screen.getByRole("searchbox"), "sku-1")

      expect(onChange).not.toHaveBeenCalled()
    })

    it("reports on click of the search button", async () => {
      const onChange = vi.fn()
      render(
        <DataTableSearch value="" onChange={onChange} submitOnChange={false} />
      )

      await userEvent.type(screen.getByRole("searchbox"), "sku-1")
      await userEvent.click(screen.getByRole("button", { name: "Search" }))

      expect(onChange).toHaveBeenCalledWith("sku-1")
    })

    it("reports on Enter", async () => {
      const onChange = vi.fn()
      render(
        <DataTableSearch value="" onChange={onChange} submitOnChange={false} />
      )

      await userEvent.type(screen.getByRole("searchbox"), "sku-1{Enter}")

      expect(onChange).toHaveBeenCalledWith("sku-1")
    })

    it("still reports the clear button immediately", async () => {
      const onChange = vi.fn()
      render(
        <DataTableSearch
          value="sku-1"
          onChange={onChange}
          submitOnChange={false}
        />
      )

      await userEvent.click(
        screen.getByRole("button", { name: "Clear search" })
      )

      expect(onChange).toHaveBeenCalledWith("")
    })
  })
})
