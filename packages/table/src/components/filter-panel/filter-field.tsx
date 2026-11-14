import { DATE_RANGE_PRESETS, FormItem } from "@toth/form"

import { toFieldName } from "../../lib/field-name"
import type { DataTableFilter, TextFilter } from "../../lib/filter-types"

// One filter, as the `@toth/form` field its type calls for.
//
// A switch over UNDESTRUCTURED props: destructuring `filter` first would collapse the union and
// every branch would lose the per-type props — `options` on a select, `presets` on a date range —
// that make it worth having.
//
// The `default` branch ASSIGNS to a `TextFilter` rather than checking for `never`: adding a member
// to `DataTableFilterType` without adding a case here becomes a compile error at the assignment
// instead of a filter that silently renders as a text box.

export interface DataTableFilterFieldProps {
  filter: DataTableFilter
}

function DataTableFilterField({ filter }: DataTableFilterFieldProps) {
  // The server is free to name a field with dots; react-hook-form reads a dot as a path into the
  // form state. The escaping is undone on the way back out, in `toFilterPayload`.
  const name = toFieldName(filter.field)
  const label = filter.label ?? filter.field

  switch (filter.type) {
    case "number":
      return (
        <FormItem
          name={name}
          type="number-range"
          label={label}
          {...filter.fieldProps}
        />
      )

    case "select":
      return (
        <FormItem
          name={name}
          type="select"
          label={label}
          options={filter.options}
          {...filter.fieldProps}
        />
      )

    case "multi-select":
      return (
        <FormItem
          name={name}
          type="multiselect"
          label={label}
          options={filter.options}
          {...filter.fieldProps}
        />
      )

    case "tags":
      return (
        <FormItem
          name={name}
          type="tags"
          label={label}
          {...filter.fieldProps}
        />
      )

    case "date":
    case "datetime":
      return (
        <FormItem
          name={name}
          type="date-range"
          label={label}
          // Rolling ranges ending today, relative to the moment they are picked.
          presets={DATE_RANGE_PRESETS}
          {...filter.fieldProps}
        />
      )

    default: {
      const textFilter: TextFilter = filter

      return (
        <FormItem
          name={name}
          type="text"
          label={textFilter.label ?? textFilter.field}
          {...textFilter.fieldProps}
        />
      )
    }
  }
}

export { DataTableFilterField }
