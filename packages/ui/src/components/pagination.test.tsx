import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@toth/ui/components/pagination"

describe("Pagination", () => {
  it("renders navigation with active page", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#1">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#2" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(
      screen.getByRole("navigation", { name: "pagination" })
    ).toBeInTheDocument()
    // Base UI Button (nativeButton={false}) renders the <a> with role="button"
    const active = screen.getByRole("button", { name: "2" })
    expect(active.tagName).toBe("A")
    expect(active).toHaveAttribute("href", "#2")
    expect(active).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("button", { name: "1" })).not.toHaveAttribute(
      "aria-current"
    )
    expect(
      screen.getByRole("button", { name: /previous/i })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
    expect(screen.getByText("More pages")).toBeInTheDocument()
  })
})
