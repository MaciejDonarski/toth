import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { Form, type FormProps } from "./form"
import { FormActions } from "./form-actions"
import { FormDefaultsProvider } from "./form-defaults"
import { FormItem } from "./form-item"
import { DATE_PRESETS, DATE_RANGE_PRESETS } from "./lib/date-presets"
import { plLocale } from "./lib/locales"
import { plMessages } from "./lib/messages"

const schema = z.record(z.string(), z.unknown())

function renderForm(
  children: ReactNode,
  {
    defaultValues = {},
    wrap = (node) => node,
    formProps = {},
  }: {
    defaultValues?: Record<string, unknown>
    wrap?: (node: ReactNode) => ReactNode
    formProps?: Partial<FormProps<typeof schema>>
  } = {}
) {
  const onSubmit = vi.fn()
  render(
    wrap(
      <Form
        schema={schema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        {...formProps}
      >
        {children}
        <FormActions actions={[{ kind: "submit", label: "Save" }]} />
      </Form>
    )
  )
  const submit = async () => {
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    return onSubmit.mock.lastCall?.[0] as Record<string, unknown>
  }
  return { submit }
}

const polish = (node: ReactNode) => (
  <FormDefaultsProvider
    locale={plLocale}
    dateFormat="dd.MM.yyyy"
    messages={plMessages}
  >
    {node}
  </FormDefaultsProvider>
)

describe("FormDefaultsProvider", () => {
  afterEach(() => vi.useRealTimers())

  it("is English with the PP format by default", () => {
    renderForm(
      <>
        <FormItem name="a" type="date" label="A" />
        <FormItem name="b" type="date" label="B" />
      </>,
      { defaultValues: { b: new Date(2024, 0, 15) } }
    )
    expect(screen.getByRole("button", { name: "A" })).toHaveTextContent(
      "Pick a date"
    )
    expect(screen.getByRole("button", { name: "B" })).toHaveTextContent(
      "Jan 15, 2024"
    )
  })

  it("translates PP with the locale alone", () => {
    renderForm(<FormItem name="d" type="date" label="D" />, {
      defaultValues: { d: new Date(2024, 0, 15) },
      wrap: (node) => (
        <FormDefaultsProvider locale={plLocale}>{node}</FormDefaultsProvider>
      ),
    })
    expect(screen.getByRole("button", { name: "D" })).toHaveTextContent(
      "15 sty 2024"
    )
  })

  it("translates the date field, its presets and the calendar", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2024, 0, 20, 12))
    const user = userEvent.setup()
    const { submit } = renderForm(
      <FormItem name="d" type="date" label="Dzień" presets={DATE_PRESETS} />,
      { wrap: polish }
    )
    const trigger = screen.getByRole("button", { name: "Dzień" })
    expect(trigger).toHaveTextContent("Wybierz datę")
    await user.click(trigger)
    expect(await screen.findByRole("grid")).toHaveAccessibleName(
      /styczeń 2024/i
    )
    const presets = screen.getByRole("group", { name: "Szybki wybór" })
    await user.click(
      within(presets).getByRole("button", { name: "Tydzień temu" })
    )
    expect(trigger).toHaveTextContent("13.01.2024")
    expect(await submit()).toEqual({ d: new Date(2024, 0, 13) })
  })

  it("translates the date-range inputs and parses the custom format", async () => {
    const user = userEvent.setup()
    const { submit } = renderForm(
      <FormItem
        name="stay"
        type="date-range"
        label="Pobyt"
        presets={DATE_RANGE_PRESETS}
      />,
      { wrap: polish }
    )
    const trigger = screen.getByRole("button", { name: "Pobyt" })
    expect(trigger).toHaveTextContent("Wybierz zakres dat")
    await user.click(trigger)
    await user.type(await screen.findByLabelText("Od"), "01.02.2024{Enter}")
    await user.type(screen.getByLabelText("Do"), "07.02.2024{Enter}")
    expect(
      screen.getByRole("button", { name: "Wyczyść datę od" })
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole("group", { name: "Szybki wybór" })).getByRole(
        "button",
        { name: "Ostatnie 7 dni" }
      )
    ).toBeInTheDocument()
    expect(trigger).toHaveTextContent("01.02.2024 – 07.02.2024")
    await user.keyboard("{Escape}")
    expect(await submit()).toEqual({
      stay: { from: new Date(2024, 1, 1), to: new Date(2024, 1, 7) },
    })
  })

  it("translates the empty text of a select", async () => {
    const user = userEvent.setup()
    renderForm(
      <FormItem
        name="c"
        type="select"
        label="Kraj"
        options={[{ value: "pl", label: "Polska" }]}
      />,
      { wrap: polish }
    )
    await user.type(screen.getByRole("combobox", { name: "Kraj" }), "xyz")
    expect(await screen.findByText("Brak wyników.")).toBeInTheDocument()
  })

  it("lets Form props override the provider, and field props override both", () => {
    renderForm(
      <>
        <FormItem name="a" type="date" label="A" />
        <FormItem name="b" type="date" label="B" placeholder="Own text" />
        <FormItem name="c" type="date" label="C" dateFormat="yyyy/MM/dd" />
        <FormItem name="d" type="date" label="D" />
      </>,
      {
        defaultValues: {
          c: new Date(2024, 0, 15),
          d: new Date(2024, 0, 15),
        },
        wrap: polish,
        formProps: { messages: { pickDate: "Data?" }, dateFormat: "d.M.yy" },
      }
    )
    expect(screen.getByRole("button", { name: "A" })).toHaveTextContent("Data?")
    expect(screen.getByRole("button", { name: "B" })).toHaveTextContent(
      "Own text"
    )
    expect(screen.getByRole("button", { name: "C" })).toHaveTextContent(
      "2024/01/15"
    )
    expect(screen.getByRole("button", { name: "D" })).toHaveTextContent(
      "15.1.24"
    )
  })

  it("merges nested providers key by key", async () => {
    const user = userEvent.setup()
    renderForm(
      <FormItem name="d" type="date" label="D" presets={DATE_PRESETS} />,
      {
        wrap: (node) =>
          polish(
            <FormDefaultsProvider
              messages={{ datePresets: { yesterday: "Wczoraj!" } }}
            >
              {node}
            </FormDefaultsProvider>
          ),
      }
    )
    await user.click(screen.getByRole("button", { name: "D" }))
    const presets = await screen.findByRole("group", { name: "Szybki wybór" })
    expect(
      within(presets).getByRole("button", { name: "Wczoraj!" })
    ).toBeInTheDocument()
    expect(
      within(presets).getByRole("button", { name: "3 dni temu" })
    ).toBeInTheDocument()
  })
})
