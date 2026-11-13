import type { Meta, StoryObj } from "@storybook/react-vite"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@toth/ui/components/chart"

const data = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const config = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-3)" },
} satisfies ChartConfig

const meta = {
  title: "UI/Chart",
  component: ChartContainer,
  tags: ["autodocs"],
  args: { config, children: <></> },
} satisfies Meta<typeof ChartContainer>

export default meta
type Story = StoryObj<typeof meta>

export const BarChartStory: Story = {
  name: "Bar chart",
  render: (args) => (
    <ChartContainer {...args} className="min-h-64 w-[32rem]">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => v.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
        <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
}

export const AreaChartStory: Story = {
  name: "Area chart",
  render: (args) => (
    <ChartContainer {...args} className="min-h-64 w-[32rem]">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ left: 12, right: 12 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => v.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Area
          dataKey="mobile"
          type="natural"
          fill="var(--color-mobile)"
          fillOpacity={0.4}
          stroke="var(--color-mobile)"
          stackId="a"
        />
        <Area
          dataKey="desktop"
          type="natural"
          fill="var(--color-desktop)"
          fillOpacity={0.4}
          stroke="var(--color-desktop)"
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  ),
}
