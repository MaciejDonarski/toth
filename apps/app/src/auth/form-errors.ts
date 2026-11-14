import type { z } from "zod"

/**
 * First message per field, in the `SubmitResult.fieldErrors` shape. Messages
 * are message KEYS; the form translates them (`translateError`).
 */
export function toFieldErrors<T extends object>(
  error: z.ZodError<T>
): Partial<Record<string, string>> {
  const result: Partial<Record<string, string>> = {}
  for (const issue of error.issues) {
    // Nested fields use react-hook-form paths, e.g. "days.1.end".
    const key = issue.path.map(String).join(".")
    if (key && !(key in result)) result[key] = issue.message
  }
  return result
}
