import type { Meta, StoryObj } from "@storybook/react-vite"
import { z } from "zod"

import { Form } from "./form"
import { FormActions } from "./form-actions"
import { FormDefaultsProvider } from "./form-defaults"
import { FormItem, type FormItemProps } from "./form-item"
import { DATE_PRESETS, DATE_RANGE_PRESETS } from "./lib/date-presets"
import { plLocale } from "./lib/locales"
import { plMessages } from "./lib/messages"

const options = [
  { value: "pl", label: "Poland" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France", disabled: true },
]

function Preview(props: FormItemProps) {
  return (
    <Form
      schema={z.record(z.string(), z.unknown())}
      onSubmit={() => {}}
      className="w-80"
    >
      <FormItem {...props} />
    </Form>
  )
}

const meta = {
  title: "Form/FormItem",
  component: Preview,
  args: { name: "field", label: "Label", type: "text" },
} satisfies Meta<typeof Preview>

export default meta
type Story = StoryObj<typeof meta>

export const Text: Story = {
  args: {
    type: "text",
    label: "Name",
    placeholder: "Ada Lovelace",
    description: "Your full name.",
    required: true,
  },
}
export const Email: Story = { args: { type: "email", label: "Email" } }
export const Time: Story = { args: { type: "time", label: "Start", step: 900 } }
export const Password: Story = { args: { type: "password", label: "Password" } }
export const NumberInput: Story = {
  args: { type: "number", label: "Quantity", min: 0, step: 1 },
}
export const Textarea: Story = {
  args: { type: "textarea", label: "Bio", rows: 4 },
}
export const Select: Story = {
  args: {
    type: "select",
    label: "Country",
    placeholder: "Select a country",
    options,
  },
}
export const Multiselect: Story = {
  args: {
    type: "multiselect",
    label: "Countries",
    placeholder: "Add country",
    options,
  },
}
export const Checkbox: Story = {
  args: {
    type: "checkbox",
    label: "Accept terms",
    description: "You agree to our policy.",
  },
}
export const Switch: Story = { args: { type: "switch", label: "Newsletter" } }
export const Radio: Story = {
  args: { type: "radio", label: "Country", options },
}
export const DatePicker: Story = { args: { type: "date", label: "Birthday" } }
export const DateRange: Story = {
  args: { type: "date-range", label: "Vacation", placeholder: "Pick a range" },
}
export const DatePickerWithPresets: Story = {
  args: { type: "date", label: "Last visit", presets: DATE_PRESETS },
}
export const DateRangeWithPresets: Story = {
  args: {
    type: "date-range",
    label: "Period",
    placeholder: "Pick a range",
    presets: DATE_RANGE_PRESETS,
  },
}
export const Disabled: Story = {
  args: { type: "text", label: "Disabled", disabled: true },
}

/** Polish via `FormDefaultsProvider`: messages, calendar and `dd.MM.yyyy`. */
export const PolishDateRange: Story = {
  args: {
    type: "date-range",
    label: "Okres",
    presets: DATE_RANGE_PRESETS,
  },
  decorators: [
    (Story) => (
      <FormDefaultsProvider
        locale={plLocale}
        dateFormat="dd.MM.yyyy"
        messages={plMessages}
      >
        <Story />
      </FormDefaultsProvider>
    ),
  ],
}

const keyedSchema = z.object({
  email: z.email("validation.email.invalid"),
})
const dictionary: Record<string, string> = {
  "validation.email.invalid": "Nieprawidłowy adres email",
}

/**
 * Schemas (and servers) return message keys; `translateError` on
 * `FormDefaultsProvider` turns them into text. Submit to see the error.
 */
export const TranslatedErrors: Story = {
  args: { type: "email", name: "email", label: "Email" },
  render: (args) => (
    <FormDefaultsProvider translateError={(key) => dictionary[key] ?? key}>
      <Form
        schema={keyedSchema}
        defaultValues={{ email: "not-an-email" }}
        onSubmit={() => {}}
        className="w-80"
      >
        <FormItem {...args} />
        <FormActions actions={[{ kind: "submit", label: "Zapisz" }]} />
      </Form>
    </FormDefaultsProvider>
  ),
}
