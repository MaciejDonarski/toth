"use client"

import { useState } from "react"
import { format } from "date-fns"

import { Calendar } from "@toth/ui/components/calendar"
import { Popover, PopoverContent } from "@toth/ui/components/popover"

import type { DateRangeItem } from "../types"
import { DateInput } from "./date-input"
import {
  DateTrigger,
  isDate,
  isRange,
  PresetList,
  type PartialRange,
} from "./date-shared"
import type { FieldRendererProps } from "./field-props"

function formatRange(range: PartialRange | undefined, pattern: string) {
  const from = isDate(range?.from) ? format(range.from, pattern) : undefined
  const to = isDate(range?.to) ? format(range.to, pattern) : undefined
  if (from && to) return `${from} – ${to}`
  if (from) return `${from} –`
  if (to) return `– ${to}`
  return undefined
}

/**
 * Date-range picker (`{ from, to }`): From/To text inputs that can be set and
 * cleared independently, optional presets, and a two-month calendar.
 */
function DateRangeField({
  item,
  field,
  inputRef,
  fieldState,
  id,
  describedBy,
}: FieldRendererProps<DateRangeItem>) {
  const [open, setOpen] = useState(false)
  const raw: unknown = field.value
  const value = isRange(raw) ? raw : undefined
  const from = isDate(value?.from) ? value.from : undefined
  const to = isDate(value?.to) ? value.to : undefined
  const pattern = item.dateFormat ?? "PP"
  const [month, setMonth] = useState<Date | undefined>(from ?? to)

  const setRange = (next: PartialRange | undefined) => {
    const nextFrom = next?.from
    const nextTo = next?.to
    field.onChange(
      nextFrom || nextTo ? { from: nextFrom, to: nextTo } : undefined
    )
    if (nextFrom ?? nextTo) setMonth(nextFrom ?? nextTo)
  }

  const close = () => {
    setOpen(false)
    field.onBlur()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setMonth(from ?? to)
        else field.onBlur()
      }}
    >
      <DateTrigger
        id={id}
        inputRef={inputRef}
        disabled={item.disabled ?? field.disabled}
        invalid={fieldState.invalid}
        describedBy={describedBy}
        label={formatRange(value, pattern)}
        placeholder={item.placeholder ?? "Pick a date range"}
      />
      <PopoverContent className="w-auto gap-0 p-0" align="start">
        <div className="flex gap-3 border-b p-3">
          <DateInput
            label="From"
            clearLabel="Clear from"
            value={from}
            pattern={pattern}
            // A start after the current end drops the end.
            onChange={(date) =>
              setRange({
                from: date,
                to: date && to && date > to ? undefined : to,
              })
            }
          />
          <DateInput
            label="To"
            clearLabel="Clear to"
            value={to}
            pattern={pattern}
            // An end before the current start drops the start.
            onChange={(date) =>
              setRange({
                from: date && from && date < from ? undefined : from,
                to: date,
              })
            }
          />
        </div>
        <div className="flex">
          <PresetList
            presets={item.presets ?? []}
            onPick={(preset) => {
              setRange(preset.value())
              close()
            }}
          />
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={from || to ? { from, to } : undefined}
            month={month}
            onMonthChange={setMonth}
            onSelect={setRange}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateRangeField }
