import type { Meta, StoryObj } from "@storybook/react-vite"
import { z } from "zod"

import { Button } from "@toth/ui/components/button"

import { Form } from "./form"
import { FormActions, type FormActionsProps } from "./form-actions"

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function Preview(props: FormActionsProps & { failSubmit?: boolean }) {
  const { failSubmit, ...actionsProps } = props
  return (
    <Form
      schema={z.object({})}
      onSubmit={async () => {
        await wait(1500)
        if (failSubmit) return { formError: "Something went wrong." }
      }}
      className="w-[min(36rem,calc(100vw-2rem))]"
    >
      <FormActions {...actionsProps} />
    </Form>
  )
}

const meta = {
  title: "Form/FormActions",
  component: Preview,
  args: {
    actions: [
      { kind: "link", label: "Cancel", href: "#" },
      { kind: "reset", label: "Reset" },
      { kind: "submit", label: "Save" },
    ],
  },
} satisfies Meta<typeof Preview>

export default meta
type Story = StoryObj<typeof meta>

export const FromActions: Story = {}
export const AlignBetween: Story = { args: { align: "between" } }
export const ServerError: Story = { args: { failSubmit: true } }
export const AsWrapper: Story = {
  args: {
    actions: undefined,
    children: (
      <>
        <Button variant="destructive" type="button">
          Delete
        </Button>
        <Button type="submit">Save</Button>
      </>
    ),
  },
}
