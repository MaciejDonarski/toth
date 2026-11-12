import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { Form } from "./form"
import { FormActions } from "./form-actions"
import { FormItem } from "./form-item"

const schema = z.object({
  email: z.email("Invalid email"),
  age: z.number().min(18, "Too young").optional(),
})

function renderForm(onSubmit: (values: z.output<typeof schema>) => unknown) {
  return render(
    <Form
      schema={schema}
      defaultValues={{ email: "" }}
      onSubmit={onSubmit as never}
    >
      <FormItem name="email" type="email" label="Email" />
      <FormItem name="age" type="number" label="Age" />
      <FormActions actions={[{ kind: "submit", label: "Save" }]} />
    </Form>
  )
}

describe("Form", () => {
  it("shows zod errors and does not submit invalid values", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm(onSubmit)

    await user.type(screen.getByLabelText("Email"), "nope")
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Invalid email")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("passes parsed values to onSubmit", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm(onSubmit)

    await user.type(screen.getByLabelText("Email"), "a@b.co")
    await user.type(screen.getByLabelText("Age"), "21")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.co", age: 21 })
    )
  })

  it("applies field and form errors returned from onSubmit", async () => {
    const user = userEvent.setup()
    renderForm(() => ({
      fieldErrors: { email: "Already taken" },
      formError: "Could not save",
    }))

    await user.type(screen.getByLabelText("Email"), "a@b.co")
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Already taken")).toBeInTheDocument()
    expect(screen.getByText("Could not save")).toBeInTheDocument()
  })

  it("disables submit and shows a spinner while submitting", async () => {
    const user = userEvent.setup()
    let resolve: () => void = () => {}
    renderForm(
      () =>
        new Promise<void>((r) => {
          resolve = r
        })
    )

    await user.type(screen.getByLabelText("Email"), "a@b.co")
    const button = screen.getByRole("button", { name: /Save/ })
    await user.click(button)

    await waitFor(() => expect(button).toBeDisabled())
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()

    resolve()
    await waitFor(() => expect(button).toBeEnabled())
  })
})
