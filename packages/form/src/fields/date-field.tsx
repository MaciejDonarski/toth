"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@toth/ui/components/button"
import { Calendar } from "@toth/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@toth/ui/components/popover"

import type { DateItem } from "../types"
import type { FieldRendererProps } from "./field-props"

function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

function isRange(value: unknown): value is DateRange {
  return typeof value === "object" && value !== null && "from" in value
}

function formatValue(value: unknown, pattern: string): string | undefined {
  if (isDate(value)) return format(value, pattern)
  if (isRange(value) && isDate(value.from)) {
    const from = format(value.from, pattern)
    return isDate(value.to) ? `${from} – ${format(value.to, pattern)}` : from
  }
  return undefined
}

/** Date picker (`Date`) or date-range picker (`{ from, to }`). */
function DateField({
  item,
  field,
  inputRef,
  fieldState,
  id,
  describedBy,
}: FieldRendererProps<DateItem>) {
  const [open, setOpen] = useState(false)
  const value: unknown = field.value
  const label = formatValue(value, item.dateFormat ?? "PP")

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) field.onBlur()
      }}
    >
      <PopoverTrigger
        render={
          <Button
            id={id}
            ref={inputRef}
            variant="outline"
            disabled={item.disabled ?? field.disabled}
            aria-invalid={fieldState.invalid || undefined}
            aria-describedby={describedBy}
            className="w-full justify-start font-normal data-[empty=true]:text-muted-foreground"
            data-empty={!label}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {label ?? item.placeholder ?? "Pick a date"}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {item.type === "date-range" ? (
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={isRange(value) ? value : undefined}
            defaultMonth={isRange(value) ? value.from : undefined}
            onSelect={(range) => field.onChange(range)}
          />
        ) : (
          <Calendar
            mode="single"
            selected={isDate(value) ? value : undefined}
            defaultMonth={isDate(value) ? value : undefined}
            onSelect={(date) => {
              field.onChange(date)
              setOpen(false)
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

export { DateField }
