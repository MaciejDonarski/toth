import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { expect, vi } from "vitest"
import { z } from "zod"

import { Form } from "../src/form"
import { FormActions } from "../src/form-actions"

/** Renders fields in a schemaless `<Form>` with a Save button; `submit()` returns the values. */
export function renderInForm(
  children: ReactNode,
  defaultValues: Record<string, unknown> = {}
) {
  const onSubmit = vi.fn()
  render(
    <Form
      schema={z.record(z.string(), z.unknown())}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
    >
      {children}
      <FormActions actions={[{ kind: "submit", label: "Save" }]} />
    </Form>
  )
  const submit = async () => {
    const calls = onSubmit.mock.calls.length
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(onSubmit.mock.calls.length).toBe(calls + 1))
    return onSubmit.mock.lastCall?.[0] as Record<string, unknown>
  }
  return { submit }
}
