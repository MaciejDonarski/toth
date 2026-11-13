import type { Meta, StoryObj } from "@storybook/react-vite"
import { REGEXP_ONLY_DIGITS } from "input-otp"

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@toth/ui/components/input-otp"

// InputOTP's props are a union (render-fn vs children), so the story exposes
// a small explicit arg surface instead of spreading all component props.
type DemoArgs = {
  disabled?: boolean
  pattern?: string
  defaultValue?: string
}

function InputOTPDemo({ disabled, pattern, defaultValue }: DemoArgs) {
  return (
    <InputOTP
      maxLength={6}
      disabled={disabled}
      pattern={pattern}
      defaultValue={defaultValue}
    >
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  )
}

const meta = {
  title: "UI/InputOTP",
  component: InputOTPDemo,
  tags: ["autodocs"],
} satisfies Meta<typeof InputOTPDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const DigitsOnly: Story = { args: { pattern: REGEXP_ONLY_DIGITS } }
export const Disabled: Story = {
  args: { disabled: true, defaultValue: "123456" },
}
