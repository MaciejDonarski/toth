import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm, useWatch } from "react-hook-form"
import { describe, expect, it, vi } from "vitest"

import { Form } from "./form"
import { FormItem } from "./form-item"

function Provided({ onSubmit }: { onSubmit?: (v: unknown) => void }) {
  const form = useForm({ defaultValues: { q: "start" } })
  const q = useWatch({ control: form.control, name: "q" })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormItem name="q" type="text" label="Query" />
      <output>{q}</output>
      <button type="submit">Go</button>
    </Form>
  )
}

describe("Form with a provided `form`", () => {
  it("uses the caller's instance and needs no schema", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Provided onSubmit={onSubmit} />)
    expect(screen.getByLabelText("Query")).toHaveValue("start")
    await user.type(screen.getByLabelText("Query"), "!")
    expect(screen.getByRole("status")).toHaveTextContent("start!")
    await user.click(screen.getByRole("button", { name: "Go" }))
    expect(onSubmit).toHaveBeenCalledWith({ q: "start!" })
  })
})
