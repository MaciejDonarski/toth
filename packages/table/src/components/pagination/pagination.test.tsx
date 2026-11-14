import type { PaginationState } from "../../lib/table-state"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DataTablePagination } from "./pagination"

function page(currentPage: number, totalPages: number): PaginationState {
  return { currentPage, totalPages, pageSize: 10, totalItems: totalPages * 10 }
}

function setup(pagination: PaginationState, siblingCount?: number) {
  const onPageChange = vi.fn()
  render(
    <DataTablePagination
      pagination={pagination}
      onPageChange={onPageChange}
      siblingCount={siblingCount}
    />
  )

  return { onPageChange }
}

describe("DataTablePagination", () => {
  it("draws nothing for a single page", () => {
    const { container } = render(
      <DataTablePagination pagination={page(1, 1)} onPageChange={vi.fn()} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("marks the current page, and only that one", () => {
    setup(page(2, 3))

    expect(
      screen.getByRole("button", { name: "Go to page 2" })
    ).toHaveAttribute("aria-current", "page")
    expect(
      screen.getByRole("button", { name: "Go to page 1" })
    ).not.toHaveAttribute("aria-current")
  })

  it("draws buttons, not links — a table page has no URL", () => {
    setup(page(1, 3))

    expect(screen.queryAllByRole("link")).toHaveLength(0)
  })

  it("disables previous on the first page and next on the last", () => {
    const first = render(
      <DataTablePagination pagination={page(1, 3)} onPageChange={vi.fn()} />
    )
    expect(
      screen.getByRole("button", { name: "Go to previous page" })
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Go to next page" })
    ).toBeEnabled()
    first.unmount()

    setup(page(3, 3))
    expect(
      screen.getByRole("button", { name: "Go to next page" })
    ).toBeDisabled()
  })

  it("reports the page asked for, by number and by step", async () => {
    const { onPageChange } = setup(page(2, 5))

    await userEvent.click(screen.getByRole("button", { name: "Go to page 4" }))
    expect(onPageChange).toHaveBeenLastCalledWith(4)

    await userEvent.click(
      screen.getByRole("button", { name: "Go to next page" })
    )
    expect(onPageChange).toHaveBeenLastCalledWith(3)

    await userEvent.click(
      screen.getByRole("button", { name: "Go to previous page" })
    )
    expect(onPageChange).toHaveBeenLastCalledWith(1)
  })

  it("elides the pages far from the current one", () => {
    setup(page(10, 20))

    expect(
      screen.getByRole("button", { name: "Go to page 1" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Go to page 20" })
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Go to page 5" })).toBeNull()
    expect(
      screen.getByRole("button", { name: "Go to page 9" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Go to page 11" })
    ).toBeInTheDocument()
  })
  it("spells Previous and Next out, and draws the current page as a tinted pill", () => {
    setup(page(2, 3))

    expect(
      screen.getByRole("button", { name: "Go to previous page" })
    ).toHaveTextContent("Previous")
    expect(
      screen.getByRole("button", { name: "Go to next page" })
    ).toHaveTextContent("Next")

    const current = screen.getByRole("button", { name: "Go to page 2" })
    expect(current).toHaveAttribute("aria-current", "page")
    expect(current).not.toHaveAttribute("data-slot", "button")
  })
})
