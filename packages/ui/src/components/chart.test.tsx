import { render, screen } from "@testing-library/react"
import { Bar, BarChart } from "recharts"
import { describe, expect, it } from "vitest"

import { ChartContainer, type ChartConfig } from "@toth/ui/components/chart"

const config = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig

const data = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
]

describe("ChartContainer", () => {
  it("renders a chart wrapper and injects CSS color variables from config", () => {
    const { container } = render(
      <ChartContainer config={config} data-testid="chart" className="h-40 w-80">
        <BarChart data={data}>
          <Bar dataKey="desktop" fill="var(--color-desktop)" />
          <Bar dataKey="mobile" fill="var(--color-mobile)" />
        </BarChart>
      </ChartContainer>
    )
    const chart = screen.getByTestId("chart")
    expect(chart).toHaveAttribute("data-slot", "chart")
    const style = container.querySelector("style")
    expect(style?.textContent).toContain("--color-desktop: var(--chart-1)")
    expect(style?.textContent).toContain("--color-mobile: var(--chart-2)")
  })
})
