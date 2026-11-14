import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { Form } from "./form"
import { FormActions } from "./form-actions"
import { FormItem } from "./form-item"
import { DATE_PRESETS, DATE_RANGE_PRESETS } from "./lib/date-presets"

const options = [
  { value: "pl", label: "Poland" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
]

function renderInForm(
  children: ReactNode,
  defaultValues: Record<string, unknown> = {}
) {
  const onSubmit = vi.fn()
  render(
    <Form
      schema={z.record(z.string(), z.unknown())}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
    >
      {children}
      <FormActions actions={[{ kind: "submit", label: "Save" }]} />
    </Form>
  )
  const submit = async () => {
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    return onSubmit.mock.lastCall?.[0] as Record<string, unknown>
  }
  return { submit }
}

describe("FormItem", () => {
  it("renders label, required mark and description", () => {
    renderInForm(
      <FormItem
        name="name"
        type="text"
        label="Name"
        required
        description="Your full name"
      />
    )
    const input = screen.getByLabelText(/Name/)
    expect(input).toHaveAttribute("type", "text")
    expect(input).toHaveAccessibleDescription("Your full name")
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true")
  })

  it.each(["email", "password", "tel", "url"] as const)(
    "renders an input of type %s",
    (type) => {
      renderInForm(<FormItem name="f" type={type} label="Field" />)
      expect(screen.getByLabelText("Field")).toHaveAttribute("type", type)
    }
  )

  it("text and textarea update the value", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <>
        <FormItem name="title" type="text" label="Title" />
        <FormItem name="bio" type="textarea" label="Bio" rows={4} />
      </>
    )
    await user.type(screen.getByLabelText("Title"), "Hi")
    await user.type(screen.getByLabelText("Bio"), "Long text")
    expect(screen.getByLabelText("Bio").tagName).toBe("TEXTAREA")
    expect(await submit()).toEqual({ title: "Hi", bio: "Long text" })
  })

  it("time keeps the HH:MM string", async () => {
    const { submit } = renderInForm(
      <FormItem type="time" name="start" label="Start" />,
      { start: "08:00" }
    )
    const input = screen.getByLabelText("Start")
    expect(input).toHaveAttribute("type", "time")
    expect(input).toHaveValue("08:00")

    await userEvent.clear(input)
    await userEvent.type(input, "09:30")
    expect(await submit()).toEqual({ start: "09:30" })
  })

  it("number maps empty input to undefined", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <FormItem name="qty" type="number" label="Qty" />,
      { qty: 3 }
    )
    await user.clear(screen.getByLabelText("Qty"))
    expect(await submit()).toEqual({ qty: undefined })
  })

  it("checkbox and switch toggle booleans", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <>
        <FormItem name="terms" type="checkbox" label="Accept terms" />
        <FormItem name="news" type="switch" label="Newsletter" />
      </>,
      { terms: false, news: true }
    )
    await user.click(screen.getByRole("checkbox", { name: "Accept terms" }))
    await user.click(screen.getByRole("switch", { name: "Newsletter" }))
    expect(await submit()).toEqual({ terms: true, news: false })
  })

  it("radio selects an option", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <FormItem name="country" type="radio" label="Country" options={options} />
    )
    const group = screen.getByRole("radiogroup", { name: "Country" })
    await user.click(within(group).getByRole("radio", { name: "Germany" }))
    expect(await submit()).toEqual({ country: "de" })
  })

  it("select picks an option from the combobox", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <FormItem
        name="country"
        type="select"
        label="Country"
        options={options}
      />
    )
    await user.click(screen.getByRole("combobox", { name: "Country" }))
    await user.click(await screen.findByRole("option", { name: "France" }))
    expect(screen.getByRole("combobox", { name: "Country" })).toHaveValue(
      "France"
    )
    expect(await submit()).toEqual({ country: "fr" })
  })

  it("multiselect collects several values as chips", async () => {
    const user = userEvent.setup()
    const { submit } = renderInForm(
      <FormItem
        name="countries"
        type="multiselect"
        label="Countries"
        options={options}
      />,
      { countries: ["pl"] }
    )
    expect(screen.getByText("Poland")).toBeInTheDocument()
    await user.click(screen.getByRole("combobox", { name: "Countries" }))
    await user.click(await screen.findByRole("option", { name: "Germany" }))
    // Multi-select keeps the popup open after picking; close it first.
    await user.keyboard("{Escape}")
    expect(await submit()).toEqual({ countries: ["pl", "de"] })
  })

  it("date shows the formatted value and opens a calendar", async () => {
    const user = userEvent.setup()
    renderInForm(<FormItem name="birthday" type="date" label="Birthday" />, {
      birthday: new Date(2024, 0, 15),
    })
    const trigger = screen.getByRole("button", { name: "Birthday" })
    expect(trigger).toHaveTextContent("Jan 15, 2024")
    await user.click(trigger)
    expect(await screen.findByRole("grid")).toBeInTheDocument()
  })

  it("date-range shows from – to", () => {
    renderInForm(<FormItem name="stay" type="date-range" label="Stay" />, {
      stay: { from: new Date(2024, 0, 1), to: new Date(2024, 0, 7) },
    })
    expect(screen.getByRole("button", { name: "Stay" })).toHaveTextContent(
      "Jan 1, 2024 – Jan 7, 2024"
    )
  })

  it("date-range shows a partial range", () => {
    renderInForm(<FormItem name="stay" type="date-range" label="Stay" />, {
      stay: { from: undefined, to: new Date(2024, 0, 7) },
    })
    expect(screen.getByRole("button", { name: "Stay" })).toHaveTextContent(
      "– Jan 7, 2024"
    )
  })

  describe("date presets and inputs", () => {
    afterEach(() => vi.useRealTimers())
    const fakeToday = () => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date(2024, 2, 15, 12))
    }

    it("date shows no presets by default", async () => {
      const user = userEvent.setup()
      renderInForm(<FormItem name="d" type="date" label="Day" />)
      await user.click(screen.getByRole("button", { name: "Day" }))
      expect(await screen.findByRole("grid")).toBeInTheDocument()
      expect(screen.queryByRole("group", { name: "Presets" })).toBeNull()
    })

    it("date preset sets the value and closes the popup", async () => {
      fakeToday()
      const user = userEvent.setup()
      const { submit } = renderInForm(
        <FormItem name="d" type="date" label="Day" presets={DATE_PRESETS} />
      )
      await user.click(screen.getByRole("button", { name: "Day" }))
      const presets = await screen.findByRole("group", { name: "Presets" })
      await user.click(
        within(presets).getByRole("button", { name: "Yesterday" })
      )
      await waitFor(() => expect(screen.queryByRole("grid")).toBeNull())
      expect(screen.getByRole("button", { name: "Day" })).toHaveTextContent(
        "Mar 14, 2024"
      )
      expect(await submit()).toEqual({ d: new Date(2024, 2, 14) })
    })

    it("date-range From/To inputs are set and cleared independently", async () => {
      const user = userEvent.setup()
      const { submit } = renderInForm(
        <FormItem name="stay" type="date-range" label="Stay" />
      )
      await user.click(screen.getByRole("button", { name: "Stay" }))
      const fromInput = await screen.findByLabelText("From")
      await user.type(fromInput, "Jan 1, 2024{Enter}")
      await user.type(screen.getByLabelText("To"), "Jan 7, 2024{Enter}")
      expect(fromInput).toHaveValue("Jan 1, 2024")

      await user.click(screen.getByRole("button", { name: "Clear from" }))
      expect(fromInput).toHaveValue("")
      expect(screen.getByLabelText("To")).toHaveValue("Jan 7, 2024")

      await user.keyboard("{Escape}")
      expect(await submit()).toEqual({
        stay: { from: undefined, to: new Date(2024, 0, 7) },
      })
    })

    it("date-range input reverts invalid text", async () => {
      const user = userEvent.setup()
      renderInForm(<FormItem name="stay" type="date-range" label="Stay" />, {
        stay: { from: new Date(2024, 0, 1), to: new Date(2024, 0, 7) },
      })
      await user.click(screen.getByRole("button", { name: "Stay" }))
      const fromInput = await screen.findByLabelText("From")
      await user.clear(fromInput)
      await user.type(fromInput, "nonsense{Enter}")
      expect(fromInput).toHaveValue("Jan 1, 2024")
      expect(fromInput).toHaveAttribute("aria-invalid", "true")
    })

    it("date-range drops the end when the start moves past it", async () => {
      const user = userEvent.setup()
      const { submit } = renderInForm(
        <FormItem name="stay" type="date-range" label="Stay" />,
        { stay: { from: new Date(2024, 0, 1), to: new Date(2024, 0, 7) } }
      )
      await user.click(screen.getByRole("button", { name: "Stay" }))
      const fromInput = await screen.findByLabelText("From")
      await user.clear(fromInput)
      await user.type(fromInput, "Jan 10, 2024{Enter}")
      expect(screen.getByLabelText("To")).toHaveValue("")
      await user.keyboard("{Escape}")
      expect(await submit()).toEqual({
        stay: { from: new Date(2024, 0, 10), to: undefined },
      })
    })

    it("date-range preset sets a rolling range", async () => {
      fakeToday()
      const user = userEvent.setup()
      const { submit } = renderInForm(
        <FormItem
          name="stay"
          type="date-range"
          label="Stay"
          presets={DATE_RANGE_PRESETS}
        />
      )
      await user.click(screen.getByRole("button", { name: "Stay" }))
      const presets = await screen.findByRole("group", { name: "Presets" })
      await user.click(
        within(presets).getByRole("button", { name: "Last 7 days" })
      )
      expect(screen.getByRole("button", { name: "Stay" })).toHaveTextContent(
        "Mar 9, 2024 – Mar 15, 2024"
      )
      expect(await submit()).toEqual({
        stay: { from: new Date(2024, 2, 9), to: new Date(2024, 2, 15) },
      })
    })
  })

  it("applies colSpan classes", () => {
    renderInForm(
      <FormItem
        name="x"
        type="text"
        label="X"
        colSpan={{ base: 12, md: 6, lg: 4 }}
      />
    )
    const field = screen.getByLabelText("X").closest("[data-slot=field]")
    expect(field).toHaveClass("col-span-12", "md:col-span-6", "lg:col-span-4")
  })
})
