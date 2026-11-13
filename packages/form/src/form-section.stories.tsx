import type { Meta, StoryObj } from "@storybook/react-vite"
import { z } from "zod"

import { Form } from "./form"
import { FormItem } from "./form-item"
import { FormSection, type FormSectionProps } from "./form-section"

const items: FormSectionProps["items"] = [
  {
    name: "street",
    type: "text",
    label: "Street",
    colSpan: { base: 12, md: 8 },
  },
  { name: "number", type: "text", label: "No.", colSpan: { base: 12, md: 4 } },
  { name: "zip", type: "text", label: "ZIP", colSpan: { base: 12, sm: 4 } },
  { name: "city", type: "text", label: "City", colSpan: { base: 12, sm: 8 } },
]

function Preview(props: FormSectionProps) {
  return (
    <Form
      schema={z.record(z.string(), z.unknown())}
      onSubmit={() => {}}
      className="w-[min(48rem,calc(100vw-2rem))]"
    >
      <FormSection {...props} />
    </Form>
  )
}

const meta = {
  title: "Form/FormSection",
  component: Preview,
  parameters: { layout: "padded" },
  args: { title: "Address", description: "Where should we ship?", items },
} satisfies Meta<typeof Preview>

export default meta
type Story = StoryObj<typeof meta>

export const Plain: Story = {}
export const InCard: Story = { args: { card: true } }
export const WithChildren: Story = {
  args: {
    card: true,
    items: undefined,
    children: (
      <>
        <FormItem name="a" type="text" label="Half" colSpan={{ md: 6 }} />
        <FormItem name="b" type="text" label="Half" colSpan={{ md: 6 }} />
        <FormItem name="c" type="textarea" label="Full width" />
      </>
    ),
  },
}
