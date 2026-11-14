import * as React from "react"
import type { FieldValues } from "react-hook-form"
import { useForm, useWatch } from "react-hook-form"

import { Form } from "@toth/form"

import { useTableMessages } from "../../hooks/use-table-locale"
import { Button } from "../../internal/button"
import { useDebouncedCallback } from "../../internal/hooks/use-debounced-callback"
import { FILTER_APPLY_DEBOUNCE } from "../data-table/data-table.constants"
import { fromFieldName, toFieldName } from "../../lib/field-name"
import type { DataTableFilter, FilteringState } from "../../lib/filter-types"
import {
  filterTypeOf,
  fromFilterValue,
  getEmptyValue,
  isEmptyValue,
  toFilterValue,
} from "../../lib/filter-types"
import { pickSearch } from "../../lib/search-filtering"
import { sortActionsByOrder } from "../../lib/sort-actions"
import { DataTableFilterField } from "./filter-field"

// The filter form, as it appears inside the toolbar's Filters panel.
//
// It is a real `<Form>` from `@toth/form` in PROVIDED mode — `useForm` here, no resolver — rather
// than a managed one.
// Filters need no validation: every field is optional by definition, an empty one simply drops out
// of the request, and there is no submission that can fail. A schema would exist only to say
// "anything goes".
//
// It also does not try to stay in two-way sync with the filtering state. It does not need to: the
// panel lives inside a popover, Base UI unmounts a closed popover, and so every time the panel
// opens it is built afresh from the current filtering. While it is open, the form is the one that
// is being edited and the one that wins.

/** The form values that redraw a filtering state, keyed by escaped field name. */
function toFormValues(
  filters: readonly DataTableFilter[],
  filtering: FilteringState
): FieldValues {
  const values: FieldValues = {}

  for (const filter of filters) {
    values[toFieldName(filter.field)] = fromFilterValue(
      filterTypeOf(filter),
      filtering[filter.field]
    )
  }

  return values
}

/** Every filter cleared — what "Reset all" puts into the form. */
function toEmptyValues(filters: readonly DataTableFilter[]): FieldValues {
  const values: FieldValues = {}

  for (const filter of filters) {
    values[toFieldName(filter.field)] = getEmptyValue(filterTypeOf(filter))
  }

  return values
}

/**
 * Form values → the filtering state to apply.
 *
 * Empty fields are dropped rather than sent as empty: a blank filter is not a filter, and sending
 * one changes the request and its cache key for nothing.
 */
function toFilterPayload(
  filters: readonly DataTableFilter[],
  values: FieldValues
): FilteringState {
  const typeByField = new Map(
    filters.map((filter) => [filter.field, filterTypeOf(filter)])
  )
  const filtering: FilteringState = {}

  for (const [name, value] of Object.entries(values)) {
    const field = fromFieldName(name)
    const type = typeByField.get(field)

    if (type === undefined || isEmptyValue(type, value)) {
      continue
    }

    filtering[field] = toFilterValue(type, value as never)
  }

  return filtering
}

export interface DataTableFilterPanelProps {
  filters: readonly DataTableFilter[]
  /** The filtering in force, which the fields open showing. */
  filtering: FilteringState
  /** Apply as the user edits. On by default; off puts the filters behind an Apply button. */
  submitOnChange?: boolean
  debounce?: number
  onApply: (filtering: FilteringState) => void
  /** Clears the field filters. The search term is not the panel's to clear. */
  onReset: () => void
  /**
   * The panel's own Reset all / Apply row. On by default; a surface that draws its own footer —
   * the table's filter sheet — turns it off where it has nothing to add.
   */
  withActions?: boolean
  className?: string
}

function DataTableFilterPanel({
  filters,
  filtering,
  submitOnChange = true,
  debounce = FILTER_APPLY_DEBOUNCE,
  onApply,
  onReset,
  withActions = true,
  className,
}: DataTableFilterPanelProps) {
  const ordered = React.useMemo(
    () => sortActionsByOrder([...filters]) as DataTableFilter[],
    [filters]
  )

  // Read once, on mount. The panel is rebuilt whenever it reopens, so there is no later moment
  // at which these would be stale.
  const [defaultValues] = React.useState(() => toFormValues(ordered, filtering))
  const form = useForm({ defaultValues })
  const messages = useTableMessages()

  const apply = useDebouncedCallback((values: FieldValues) => {
    // The search term shares the filtering map with the field filters, and the panel knows
    // nothing about it — carrying it across is what stops an apply from clearing the search box.
    onApply({ ...pickSearch(filtering), ...toFilterPayload(ordered, values) })
  }, debounce)

  const values = useWatch({ control: form.control })
  // `useWatch` hands back a new object every render, so the effect below keys off the CONTENT
  // instead. Without it the effect would fire on every render and the debounce would never
  // settle.
  const valuesKey = JSON.stringify(values)

  // Nothing has changed on the first pass — the values are the ones the panel opened with, and
  // applying them would fire a request for the filtering that is already in force.
  const isFirstPassRef = React.useRef(true)

  React.useEffect(() => {
    if (isFirstPassRef.current) {
      isFirstPassRef.current = false
      return
    }

    if (submitOnChange) {
      apply.call(form.getValues())
    }
  }, [valuesKey, submitOnChange, apply, form])

  const handleReset = () => {
    // The pending apply is cancelled first: the reset below changes the values, which would
    // otherwise fire one more debounced apply for the state `onReset` is about to set anyway.
    apply.cancel()
    form.reset(toEmptyValues(ordered))
    onReset()
  }

  return (
    <div className={className}>
      <Form
        form={form}
        className="gap-4"
        onSubmit={(submitted: FieldValues) => {
          apply.cancel()
          onApply({
            ...pickSearch(filtering),
            ...toFilterPayload(ordered, submitted),
          })
        }}
      >
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          {ordered.map((filter) => (
            <DataTableFilterField key={filter.field} filter={filter} />
          ))}
        </div>

        {withActions ? (
          <div className="flex items-center justify-between gap-2 border-t pt-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleReset}
            >
              {messages.filters.reset}
            </Button>

            {/* Only where there is something to submit. With submit-on-change the button
                        would never have anything left to do by the time it was reached. */}
            {submitOnChange ? null : (
              <Button type="submit" size="sm">
                {messages.filters.apply}
              </Button>
            )}
          </div>
        ) : null}
      </Form>
    </div>
  )
}

export { DataTableFilterPanel, toFilterPayload, toFormValues }
