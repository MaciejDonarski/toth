// The handful of object helpers the table needs, in place of a lodash dependency.
//
// `@toth/table` ships no general-purpose utility library on purpose: every function here is a
// few lines, and the alternative is a runtime dependency whose surface is a hundred times what we
// use. They are deliberately narrow — `getPath` walks plain objects and arrays and nothing else,
// `mergeConfig` merges plain objects and replaces everything else — because a table's config and a
// row of data are the only shapes they ever see.

/** A plain `{}` object, as opposed to an array, a `Date`, a class instance or `null`. */
export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Reads a dotted path out of a row: `getPath(row, 'customer.address.city')`.
 *
 * A column's `id` and a filter's `field` are both allowed to be paths, because the server returns
 * nested objects and flattening them into the row would be the consumer's work rather than ours.
 * A missing link returns `undefined` rather than throwing, so a partially-loaded row renders blank
 * instead of taking the page down.
 */
export function getPath(source: unknown, path: string): unknown {
  if (!path) return undefined

  let current = source

  for (const segment of path.split(".")) {
    if (current === null || current === undefined) {
      return undefined
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

/**
 * Merges config layers left to right — defaults, then a provider's, then the caller's props.
 *
 * Plain objects merge AT RUNTIME however deep they go; ARRAYS REPLACE. A caller passing
 * `sizes: [10, 20]` means exactly those two, not those two on top of the defaults — merging arrays
 * by index would leave a longer default showing through the end of a shorter override, which is
 * never what a config means. `undefined` on a later layer is "not specified" and leaves the earlier
 * value standing; `null` is a value and wins.
 *
 * The parameter type is a one-level `Partial`, which is enough because the nested shapes this
 * merges — the `*Options` bags — have optional members of their own. A `DeepPartial` would have to
 * descend into `ReactNode` too, and mapping over a `ReactElement` produces a type nothing satisfies.
 */
export function mergeConfig<TResult extends object>(
  ...sources: (Partial<TResult> | undefined)[]
): TResult {
  const result: Record<string, unknown> = {}

  for (const source of sources) {
    if (!source) continue

    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue

      const current = result[key]
      result[key] =
        isPlainObject(current) && isPlainObject(value)
          ? mergeConfig(current, value)
          : value
    }
  }

  return result as TResult
}

/** A copy without the given keys. */
export function omitKeys<TValue>(
  source: Record<string, TValue>,
  keys: readonly string[]
): Record<string, TValue> {
  const drop = new Set(keys)
  const result: Record<string, TValue> = {}

  for (const [key, value] of Object.entries(source)) {
    if (!drop.has(key)) {
      result[key] = value
    }
  }

  return result
}

/** A copy of only the given keys that are actually present. */
export function pickKeys<TValue>(
  source: Record<string, TValue>,
  keys: readonly string[]
): Record<string, TValue> {
  const result: Record<string, TValue> = {}

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key] as TValue
    }
  }

  return result
}
