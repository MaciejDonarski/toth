import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@toth/ui/components/table"

describe("Table", () => {
  it("renders a semantic table", () => {
    render(
      <Table>
        <TableCaption>Recent invoices</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>INV001</TableCell>
            <TableCell>$250.00</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>$250.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )
    const table = screen.getByRole("table", { name: "Recent invoices" })
    expect(within(table).getAllByRole("columnheader")).toHaveLength(2)
    expect(within(table).getAllByRole("row")).toHaveLength(3)
    expect(screen.getByRole("cell", { name: "INV001" })).toBeInTheDocument()
  })
})
