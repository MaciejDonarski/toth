"use client"

import { Checkbox } from "@toth/ui/components/checkbox"
import { Switch } from "@toth/ui/components/switch"

import type { BooleanItem } from "../types"
import type { FieldRendererProps } from "./field-props"

/** Checkbox / switch. Bound to a boolean value. */
function BooleanField({
  item,
  field,
  inputRef,
  fieldState,
  id,
  describedBy,
}: FieldRendererProps<BooleanItem>) {
  const Control = item.type === "switch" ? Switch : Checkbox

  return (
    <Control
      id={id}
      ref={inputRef}
      name={field.name}
      checked={field.value === true}
      onCheckedChange={(checked) => field.onChange(checked)}
      onBlur={field.onBlur}
      disabled={item.disabled ?? field.disabled}
      aria-invalid={fieldState.invalid || undefined}
      aria-describedby={describedBy}
    />
  )
}

export { BooleanField }
