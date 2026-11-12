"use client"

import { useState } from "react"
import { format } from "date-fns"

import { Calendar } from "@toth/ui/components/calendar"
import { Popover, PopoverContent } from "@toth/ui/components/popover"

import type { DateItem } from "../types"
import { DateTrigger, isDate, PresetList } from "./date-shared"
import type { FieldRendererProps } from "./field-props"

/** Single date picker (`Date`), with optional presets. */
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
  const selected = isDate(value) ? value : undefined

  const pick = (date: Date | undefined) => {
    field.onChange(date)
    setOpen(false)
    field.onBlur()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) field.onBlur()
      }}
    >
      <DateTrigger
        id={id}
        inputRef={inputRef}
        disabled={item.disabled ?? field.disabled}
        invalid={fieldState.invalid}
        describedBy={describedBy}
        label={selected && format(selected, item.dateFormat ?? "PP")}
        placeholder={item.placeholder ?? "Pick a date"}
      />
      <PopoverContent className="w-auto flex-row gap-0 p-0" align="start">
        <PresetList
          presets={item.presets ?? []}
          onPick={(preset) => pick(preset.value())}
        />
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={pick}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DateField }
