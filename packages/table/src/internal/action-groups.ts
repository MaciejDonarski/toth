/** One entry, or an array of them — an array is a group, separated from its neighbours. */
export type ActionGroupEntry<T> = T | T[]

/**
 * Flattens entries into the groups a separator goes between. A nested array is
 * its own group; a run of loose entries is one group; an empty array yields none.
 */
export function actionGroups<T>(entries: ActionGroupEntry<T>[]): T[][] {
  const groups: T[][] = []
  let loose: T[] | null = null

  for (const entry of entries) {
    if (Array.isArray(entry)) {
      loose = null
      if (entry.length > 0) groups.push(entry)
      continue
    }
    if (!loose) {
      loose = []
      groups.push(loose)
    }
    loose.push(entry)
  }

  return groups
}
