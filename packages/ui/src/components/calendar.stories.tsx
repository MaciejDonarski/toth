import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import type { DateRange } from "react-day-picker"

import { Calendar } from "@toth/ui/components/calendar"

const meta = {
  title: "UI/Calendar",
  component: Calendar,
  tags: ["autodocs"],
} satisfies Meta<typeof Calendar>

export default meta
type Story = StoryObj<typeof meta>

// Fixed dates keep stories deterministic (and render functions pure).
const TODAY = new Date(2026, 5, 12)
const IN_FIVE_DAYS = new Date(2026, 5, 17)

function SingleDemo() {
  const [date, setDate] = React.useState<Date | undefined>(TODAY)
  return (
    <Calendar
      mode="single"
      defaultMonth={TODAY}
      selected={date}
      onSelect={setDate}
      className="rounded-lg border"
    />
  )
}

function RangeDemo() {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: TODAY,
    to: IN_FIVE_DAYS,
  })
  return (
    <Calendar
      mode="range"
      numberOfMonths={2}
      defaultMonth={TODAY}
      selected={range}
      onSelect={setRange}
      className="rounded-lg border"
    />
  )
}

export const Single: Story = { render: () => <SingleDemo /> }
export const Range: Story = { render: () => <RangeDemo /> }

export const DropdownCaption: Story = {
  render: () => (
    <Calendar
      mode="single"
      captionLayout="dropdown"
      className="rounded-lg border"
    />
  ),
}
