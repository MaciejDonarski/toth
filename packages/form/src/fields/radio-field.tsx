"use client"

import { Field, FieldLabel } from "@toth/ui/components/field"
import { RadioGroup, RadioGroupItem } from "@toth/ui/components/radio-group"
import { cn } from "@toth/ui/lib/utils"

import type { RadioItem } from "../types"
import type { FieldRendererProps } from "./field-props"

function RadioField({
  item,
  field,
  inputRef,
  fieldState,
  id,
  labelId,
  describedBy,
}: FieldRendererProps<RadioItem>) {
  const value: unknown = field.value

  return (
    <RadioGroup
      id={id}
      ref={inputRef}
      name={field.name}
      value={typeof value === "string" ? value : null}
      onValueChange={(next) => field.onChange(next)}
      onBlur={field.onBlur}
      disabled={item.disabled ?? field.disabled}
      aria-labelledby={labelId}
      aria-invalid={fieldState.invalid || undefined}
      aria-describedby={describedBy}
      className={cn(
        item.orientation === "horizontal" && "flex flex-wrap gap-x-6"
      )}
    >
      {item.options.map((option) => {
        const optionId = `${id}-${option.value}`
        return (
          <Field
            key={option.value}
            orientation="horizontal"
            data-disabled={option.disabled || undefined}
            className="w-auto"
          >
            <RadioGroupItem
              id={optionId}
              value={option.value}
              disabled={option.disabled}
              aria-invalid={fieldState.invalid || undefined}
            />
            <FieldLabel htmlFor={optionId} className="font-normal">
              {option.label}
            </FieldLabel>
          </Field>
        )
      })}
    </RadioGroup>
  )
}

export { RadioField }
