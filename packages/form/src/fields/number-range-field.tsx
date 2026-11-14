"use client"

import { Input } from "@toth/ui/components/input"

import { useFormLocale } from "../form-context"
import type { NumberRangeItem, NumberRangeValue } from "../types"
import type { FieldRendererProps } from "./field-props"

function toRange(value: unknown): NumberRangeValue {
  if (value && typeof value === "object") {
    const { from, to } = value as Partial<NumberRangeValue>
    return {
      from: typeof from === "number" ? from : null,
      to: typeof to === "number" ? to : null,
    }
  }
  return { from: null, to: null }
}

/**
 * Number range (`{ from, to }`): two number inputs, each end optional. An
 * empty end is `null`, so "at least 5" is `{ from: 5, to: null }`.
 */
function NumberRangeField({
  item,
  field,
  inputRef,
  fieldState,
  id,
  labelId,
  describedBy,
}: FieldRendererProps<NumberRangeItem>) {
  const { messages } = useFormLocale()
  const range = toRange(field.value)
  const disabled = item.disabled ?? field.disabled

  const input = (end: keyof NumberRangeValue) => (
    <Input
      id={end === "from" ? id : `${id}-to`}
      ref={end === "from" ? inputRef : undefined}
      name={`${field.name}.${end}`}
      type="number"
      inputMode="decimal"
      value={range[end] ?? ""}
      onChange={(event) =>
        field.onChange({
          ...range,
          [end]: event.target.value === "" ? null : event.target.valueAsNumber,
        })
      }
      onBlur={field.onBlur}
      placeholder={end === "from" ? messages.from : messages.to}
      aria-label={end === "from" ? messages.from : messages.to}
      disabled={disabled}
      min={item.min}
      max={item.max}
      step={item.step}
      aria-invalid={fieldState.invalid || undefined}
      aria-describedby={describedBy}
    />
  )

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      data-slot="number-range"
      className="flex items-center gap-2"
    >
      {input("from")}
      <span aria-hidden="true" className="text-muted-foreground">
        –
      </span>
      {input("to")}
    </div>
  )
}

export { NumberRangeField }
