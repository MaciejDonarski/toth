"use client"

import { cn } from "@toth/ui/lib/utils"

import type { ColorItem } from "../types"
import type { FieldRendererProps } from "./field-props"

/** A row of round swatches; native radios give arrow-key navigation. */
function ColorField({
  item,
  field,
  inputRef,
  fieldState,
  id,
  labelId,
  describedBy,
}: FieldRendererProps<ColorItem>) {
  const value: unknown = field.value
  const disabled = item.disabled ?? field.disabled

  return (
    <div
      id={id}
      role="radiogroup"
      aria-labelledby={labelId}
      aria-invalid={fieldState.invalid || undefined}
      aria-describedby={describedBy}
      className="flex flex-wrap gap-2"
    >
      {item.options.map((option, index) => (
        <label
          key={option.value}
          title={option.label}
          className={cn(
            "relative size-8 cursor-pointer rounded-full",
            (disabled || option.disabled) && "cursor-not-allowed opacity-50"
          )}
        >
          <input
            ref={index === 0 ? inputRef : undefined}
            type="radio"
            name={field.name}
            value={option.value}
            checked={value === option.value}
            disabled={disabled || option.disabled}
            aria-label={option.label}
            onChange={() => field.onChange(option.value)}
            onBlur={field.onBlur}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            style={{ backgroundColor: option.color }}
            className="block size-full rounded-full ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
          />
        </label>
      ))}
    </div>
  )
}

export { ColorField }
