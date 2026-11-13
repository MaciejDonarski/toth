import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@toth/ui/components/code-block"

describe("CodeBlock", () => {
  it("renders header, numbered lines and footer", () => {
    const { container } = render(
      <CodeBlock data-testid="block" size="sm">
        <CodeBlockHeader>
          <CodeBlockTitle>index.ts</CodeBlockTitle>
        </CodeBlockHeader>
        <CodeBlockContent lineNumbers>
          {"const a = 1\nconst b = 2\n"}
        </CodeBlockContent>
        <CodeBlockFooter>TypeScript</CodeBlockFooter>
      </CodeBlock>
    )
    expect(screen.getByTestId("block")).toHaveAttribute("data-size", "sm")
    expect(screen.getByText("index.ts")).toBeInTheDocument()
    expect(
      container.querySelectorAll("[data-slot=code-block-line]")
    ).toHaveLength(2)
    expect(screen.getByText("TypeScript")).toBeInTheDocument()
  })

  it("marks line variants", () => {
    render(
      <CodeBlockContent>
        <CodeBlockLine variant="added" data-testid="line">
          + new
        </CodeBlockLine>
      </CodeBlockContent>
    )
    expect(screen.getByTestId("line")).toHaveAttribute("data-variant", "added")
  })

  it("copies the value to the clipboard", async () => {
    const user = userEvent.setup()
    render(
      <CodeBlock>
        <CodeBlockActions>
          <CodeBlockCopyButton value="pnpm install" />
        </CodeBlockActions>
      </CodeBlock>
    )
    await user.click(screen.getByRole("button", { name: "Copy" }))
    await expect(navigator.clipboard.readText()).resolves.toBe("pnpm install")
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument()
    )
  })
})
