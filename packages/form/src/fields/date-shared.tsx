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

/** Text of a preset: its own `label`, or the translation of `labelKey`. */
export function presetLabel<TKey extends string>(
  preset: { label?: string; labelKey?: TKey },
  translations: Record<TKey, string>
): string {
  return preset.label ?? (preset.labelKey ? translations[preset.labelKey] : "")
}

export interface PresetOption {
  label: string
  onPick: () => void
}

interface PresetListProps {
  /** Accessible name of the group. */
  label: string
  options: PresetOption[]
}

/** Column of shortcut buttons next to the calendar. Renders nothing when empty. */
export function PresetList({ label, options }: PresetListProps): ReactNode {
  if (options.length === 0) return null
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-col gap-1 border-r p-3"
    >
      {options.map((option) => (
        <Button
          key={option.label}
          type="button"
          variant="ghost"
          size="sm"
          className="justify-start font-normal"
          onClick={option.onPick}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
