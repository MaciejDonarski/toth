"use client"

import { Input } from "@toth/ui/components/input"

import type { InputItem } from "../types"
import type { FieldRendererProps } from "./field-props"

function InputField({
  item,
  field,
  inputRef,
  fieldState,
  id,
  describedBy,
}: FieldRendererProps<InputItem>) {
  const isNumber = item.type === "number"
  const value: unknown = field.value

  return (
    <Input
      id={id}
      ref={inputRef}
      name={field.name}
      type={item.type}
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(event) => {
        if (!isNumber) {
          field.onChange(event.target.value)
          return
        }
        // Empty number input → undefined, so `z.number().optional()` works.
        field.onChange(
          event.target.value === "" ? undefined : event.target.valueAsNumber
        )
      }}
      onBlur={field.onBlur}
      placeholder={item.placeholder}
      disabled={item.disabled ?? field.disabled}
      autoComplete={item.autoComplete}
      min={item.min}
      max={item.max}
      step={item.step}
      inputMode={isNumber ? "decimal" : undefined}
      aria-invalid={fieldState.invalid || undefined}
      aria-describedby={describedBy}
    />
  )
}

export { InputField }
