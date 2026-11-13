import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@toth/ui/components/accordion"

const items = [
  {
    value: "a",
    q: "Is it accessible?",
    a: "Yes. It adheres to the WAI-ARIA design pattern.",
  },
  {
    value: "b",
    q: "Is it styled?",
    a: "Yes. It comes with the project's preset styles.",
  },
  { value: "c", q: "Is it animated?", a: "Yes. It's animated by default." },
]

const meta = {
  title: "UI/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  args: { defaultValue: ["a"] },
  render: (args) => (
    <Accordion {...args} className="w-96">
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent>{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Multiple: Story = {
  args: { multiple: true, defaultValue: ["a", "b"] },
}
export const Disabled: Story = { args: { disabled: true } }
