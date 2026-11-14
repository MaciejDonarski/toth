/**
 * Ordering for toolbar actions that several places contribute to.
 *
 * The table's own actions (columns, filters), the async layer's (refresh, export) and the
 * consumer's all land in one list, and none of them knows about the others. `order` is the seam:
 * each contributor states where it belongs on a shared scale, and the toolbar sorts once.
 *
 * The anchors the library itself uses are in `data-table.constants.ts`, so a consumer can place an
 * action relative to them (`order: EXPORT_ACTION_ORDER - 1` to sit just before Export).
 */

/** Anything the toolbar can place. A group is ordered by its first member. */
export interface Orderable {
  order?: number
}

/** One action, or a nested array of them — the shape `Actions` takes. */
export type OrderableEntry<T extends Orderable> = T | T[]

// Without an `order` an action keeps its position relative to the ones around it, on the same
// scale explicit orders use. The step of 10 is what leaves room to slot something between two
// unordered neighbours later without renumbering either.
function orderOf<T extends Orderable>(
  entry: OrderableEntry<T>,
  index: number
): number {
  const first = Array.isArray(entry) ? entry[0] : entry
  return first?.order ?? (index + 1) * 10
}

/**
 * Sorts entries by `order`, leaving groups intact.
 *
 * Stable: two entries with the same order keep the sequence they were given in, so a consumer
 * appending to a list never reshuffles what was already there.
 */
export function sortActionsByOrder<T extends Orderable>(
  entries: OrderableEntry<T>[]
): OrderableEntry<T>[] {
  return entries
    .map((entry, index) => ({ entry, index, order: orderOf(entry, index) }))
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map(({ entry }) => entry)
}
