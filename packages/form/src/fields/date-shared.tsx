"use client"

import type { ReactNode } from "react"
import { CalendarIcon } from "lucide-react"
import type { RefCallBack } from "react-hook-form"

import { Button } from "@toth/ui/components/button"
import { PopoverTrigger } from "@toth/ui/components/popover"

/** A range where either end may be missing while it is being edited. */
export interface PartialRange {
  from?: Date
  to?: Date
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

export function isRange(value: unknown): value is PartialRange {
  return (
    typeof value === "object" &&
    value !== null &&
    ("from" in value || "to" in value)
  )
}

interface DateTriggerProps {
  id: string
  inputRef: RefCallBack
  disabled?: boolean
  invalid: boolean
  describedBy?: string
  label?: string
  placeholder: string
}

/** Outline button that opens the date popover and shows the current value. */
export function DateTrigger({
  id,
  inputRef,
  disabled,
  invalid,
  describedBy,
  label,
  placeholder,
}: DateTriggerProps) {
  return (
    <PopoverTrigger
      render={
        <Button
          id={id}
          ref={inputRef}
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="w-full justify-start font-normal data-[empty=true]:text-muted-foreground"
          data-empty={!label}
        />
      }
    >
      <CalendarIcon data-icon="inline-start" />
      {label ?? placeholder}
    </PopoverTrigger>
  )
}

interface PresetListProps<TPreset extends { label: string }> {
  presets: TPreset[]
  onPick: (preset: TPreset) => void
}

/** Column of shortcut buttons next to the calendar. Renders nothing when empty. */
export function PresetList<TPreset extends { label: string }>({
  presets,
  onPick,
}: PresetListProps<TPreset>): ReactNode {
  if (presets.length === 0) return null
  return (
    <div
      role="group"
      aria-label="Presets"
      className="flex flex-col gap-1 border-r p-3"
    >
      {presets.map((preset) => (
        <Button
          key={preset.label}
          type="button"
          variant="ghost"
          size="sm"
          className="justify-start font-normal"
          onClick={() => onPick(preset)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
