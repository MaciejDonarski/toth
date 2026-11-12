"use client"

import { Textarea } from "@toth/ui/components/textarea"

import type { TextareaItem } from "../types"
import type { FieldRendererProps } from "./field-props"

function TextareaField({
  item,
  field,
  inputRef,
  fieldState,
  id,
  describedBy,
}: FieldRendererProps<TextareaItem>) {
  const value: unknown = field.value

  return (
    <Textarea
      id={id}
      ref={inputRef}
      name={field.name}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => field.onChange(event.target.value)}
      onBlur={field.onBlur}
      rows={item.rows}
      placeholder={item.placeholder}
      disabled={item.disabled ?? field.disabled}
      aria-invalid={fieldState.invalid || undefined}
      aria-describedby={describedBy}
    />
  )
}

export { TextareaField }
