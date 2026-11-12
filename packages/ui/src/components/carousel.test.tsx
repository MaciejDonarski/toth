import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@toth/ui/components/carousel"

describe("Carousel", () => {
  it("renders a carousel region with slides and navigation", () => {
    render(
      <Carousel>
        <CarouselContent>
          {[1, 2, 3].map((n) => (
            <CarouselItem key={n}>Slide {n}</CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    )
    const region = screen.getByRole("region")
    expect(region).toHaveAttribute("aria-roledescription", "carousel")
    expect(screen.getAllByRole("group")).toHaveLength(3)
    expect(screen.getAllByRole("group")[0]).toHaveAttribute(
      "aria-roledescription",
      "slide"
    )
    expect(
      screen.getByRole("button", { name: /previous slide/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /next slide/i })
    ).toBeInTheDocument()
  })

  it("applies vertical orientation", () => {
    render(
      <Carousel orientation="vertical">
        <CarouselContent data-testid="content">
          <CarouselItem>Only</CarouselItem>
        </CarouselContent>
      </Carousel>
    )
    expect(screen.getByTestId("content")).toHaveClass("flex-col")
  })
})
