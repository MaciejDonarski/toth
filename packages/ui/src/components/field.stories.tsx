import type { Meta, StoryObj } from "@storybook/react-vite"

import { Checkbox } from "@toth/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@toth/ui/components/field"
import { Input } from "@toth/ui/components/input"
import { Switch } from "@toth/ui/components/switch"
import { Textarea } from "@toth/ui/components/textarea"

const meta = {
  title: "UI/Field",
  component: Field,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "inline-radio",
      options: ["vertical", "horizontal", "responsive"],
    },
  },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <FieldSet className="w-96">
      <FieldLegend>Payment method</FieldLegend>
      <FieldDescription>
        All transactions are secure and encrypted.
      </FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="field-name">Name on card</FieldLabel>
          <Input id="field-name" placeholder="Evil Rabbit" />
        </Field>
        <Field data-invalid>
          <FieldLabel htmlFor="field-number">Card number</FieldLabel>
          <Input
            id="field-number"
            placeholder="1234 5678 9012 3456"
            aria-invalid
          />
          <FieldError errors={[{ message: "Card number is invalid." }]} />
        </Field>
        <FieldSeparator>Optional</FieldSeparator>
        <Field>
          <FieldLabel htmlFor="field-comments">Comments</FieldLabel>
          <Textarea
            id="field-comments"
            placeholder="Add any additional comments"
          />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <FieldGroup className="w-96">
      <Field orientation="horizontal">
        <Checkbox id="field-terms" defaultChecked />
        <FieldLabel htmlFor="field-terms">
          Accept terms and conditions
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>Multi-factor authentication</FieldTitle>
          <FieldDescription>
            Enable MFA to secure your account.
          </FieldDescription>
        </FieldContent>
        <Switch aria-label="Multi-factor authentication" />
      </Field>
    </FieldGroup>
  ),
}
