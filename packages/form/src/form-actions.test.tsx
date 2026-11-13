import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { Form, type FormProps } from "./form"
import { FormActions } from "./form-actions"
import { FormItem } from "./form-item"

const schema = z.object({ name: z.string() })

function renderActions(
  node: ReactNode,
  props: Partial<FormProps<typeof schema>> = {}
) {
  return render(
    <Form
      schema={schema}
      defaultValues={{ name: "Ada" }}
      onSubmit={() => {}}
      {...props}
    >
      <FormItem name="name" type="text" label="Name" />
      {node}
    </Form>
  )
}

describe("FormActions", () => {
  it("renders children as a wrapper", () => {
    renderActions(
      <FormActions>
        <button type="button">Custom</button>
      </FormActions>
    )
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument()
  })

  it("renders actions from config", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderActions(
      <FormActions
        actions={[
          { kind: "button", label: "Preview", onClick },
          { kind: "link", label: "Cancel", href: "/back" },
          { kind: "submit", label: "Save" },
        ]}
      />
    )
    await user.click(screen.getByRole("button", { name: "Preview" }))
    expect(onClick).toHaveBeenCalledOnce()
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "submit"
    )
    expect(screen.getByText("Cancel").closest("a")).toHaveAttribute(
      "href",
      "/back"
    )
  })

  it("reset restores default values", async () => {
    const user = userEvent.setup()
    renderActions(<FormActions actions={[{ kind: "reset", label: "Reset" }]} />)
    const input = screen.getByLabelText("Name")
    await user.clear(input)
    await user.type(input, "Grace")
    await user.click(screen.getByRole("button", { name: "Reset" }))
    expect(input).toHaveValue("Ada")
  })

  it("uses the linkComponent from Form", () => {
    function TestLink({
      href,
      children,
    }: {
      href: string
      children?: ReactNode
    }) {
      return (
        <a href={href} data-testid="custom-link">
          {children}
        </a>
      )
    }
    renderActions(
      <FormActions actions={[{ kind: "link", label: "Back", href: "/x" }]} />,
      { linkComponent: TestLink as never }
    )
    expect(screen.getByTestId("custom-link")).toHaveAttribute("href", "/x")
  })
})
