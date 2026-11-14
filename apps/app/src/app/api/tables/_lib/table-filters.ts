import { z } from "zod"

/**
 * Zod parsers for the values `@toth/table` puts into `filtering`, one per
 * filter type used. Each turns the wire value into what a `ListQuery` filter
 * holds; `table-route.ts` reports a value that does not parse as a 400.
 */

/** `type: "text"` — a trimmed string. */
export const textFilter = z.string().trim().max(200)

/** `type: "multi-select"` — a bare array of option values. */
export function multiSelectFilter<
  const T extends readonly [string, ...string[]],
>(values: T) {
  return z.array(z.enum(values)).max(values.length)
}

/** `type: "select"` — the `{ operator: "eq", value }` envelope, unwrapped. */
export function selectFilter<const T extends readonly [string, ...string[]]>(
  values: T
) {
  return z
    .object({ operator: z.literal("eq"), value: z.enum(values) })
    .transform((envelope) => envelope.value)
}
