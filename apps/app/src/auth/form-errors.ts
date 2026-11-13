import type { z } from "zod"

/** First message per field, in the `SubmitResult.fieldErrors` shape. */
export function toFieldErrors<T extends object>(
  error: z.ZodError<T>
): Partial<Record<Extract<keyof T, string>, string>> {
  const result: Partial<Record<string, string>> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === "string" && !(key in result)) {
      result[key] = issue.message
    }
  }
  return result as Partial<Record<Extract<keyof T, string>, string>>
}

export const GENERIC_ERROR = "Coś poszło nie tak. Spróbuj ponownie za chwilę."

export const RATE_LIMITED_ERROR =
  "Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie."
