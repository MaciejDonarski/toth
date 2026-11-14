import type { SearchableField } from "../../data-table/data-table.types"
import * as React from "react"

export interface UseSearchableFieldsOptions {
  /** Only asked for when the table actually has a search box. */
  enabled: boolean
  domain?: string
  getSearchableFields?: (domain?: string) => Promise<SearchableField[]>
}

const NONE: SearchableField[] = []

/**
 * The fields the server will match a full-text term against.
 *
 * Loaded rather than declared, because which fields are searchable is the backend's answer and it
 * changes with the entity. The list is only ever shown — it tells the user what the box searches —
 * so failing to load it costs a tooltip, not the feature: the box still works, and the server still
 * decides what it matches.
 */
export function useSearchableFields({
  enabled,
  domain,
  getSearchableFields,
}: UseSearchableFieldsOptions): SearchableField[] {
  const [fields, setFields] = React.useState<SearchableField[]>(NONE)

  React.useEffect(() => {
    if (!enabled || !getSearchableFields) {
      return undefined
    }

    // A domain can change while a request for the previous one is still out. The flag is what
    // stops the slower answer from overwriting the newer one.
    let current = true

    getSearchableFields(domain)
      .then((loaded) => {
        if (current) setFields(loaded)
      })
      .catch(() => {
        if (current) setFields(NONE)
      })

    return () => {
      current = false
    }
  }, [enabled, domain, getSearchableFields])

  return fields
}
