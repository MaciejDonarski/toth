import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form"

/**
 * What `onSubmit` may return to report server-side failures.
 * `fieldErrors` land on the matching fields, `formError` above `FormActions`.
 */
export interface SubmitResult<TValues extends FieldValues = FieldValues> {
  fieldErrors?: Partial<Record<FieldPath<TValues>, string>>
  formError?: string
}

/** Pushes `fieldErrors` into react-hook-form; returns the form-level error. */
export function applySubmitResult<TValues extends FieldValues>(
  result: SubmitResult<TValues> | void | undefined,
  setError: UseFormSetError<TValues>
): string | undefined {
  if (!result) return undefined

  const entries = Object.entries(result.fieldErrors ?? {}) as Array<
    [FieldPath<TValues>, string | undefined]
  >
  let focused = false
  for (const [name, message] of entries) {
    if (!message) continue
    setError(name, { type: "server", message }, { shouldFocus: !focused })
    focused = true
  }

  return result.formError
}
