import type { ComponentProps, ComponentType, ReactNode } from "react"
import type { FieldPath, FieldValues } from "react-hook-form"

import type { Button } from "@toth/ui/components/button"

import type { DatePresetKey, DateRangePresetKey } from "./lib/messages"

/* -------------------------------------------------------------------------- */
/* Grid                                                                       */
/* -------------------------------------------------------------------------- */

export type Breakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl"

/** Number of columns (out of 12) a field spans. */
export type Span = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

/** Column span per Tailwind breakpoint, mobile-first. */
export type ColSpan = Partial<Record<Breakpoint, Span>>

/* -------------------------------------------------------------------------- */
/* Fields                                                                     */
/* -------------------------------------------------------------------------- */

export interface FormOption {
  value: string
  label: string
  disabled?: boolean
}

/** Native input types. `time` holds a `"HH:MM"` string. */
export type InputType =
  "text" | "email" | "password" | "number" | "tel" | "url" | "time"

interface BaseItem<TValues extends FieldValues> {
  name: FieldPath<TValues>
  label: ReactNode
  description?: ReactNode
  placeholder?: string
  disabled?: boolean
  /** Visual marker only — validation lives in the zod schema. */
  required?: boolean
  /** Column span inside a `FormSection` grid. Defaults to `{ base: 12 }`. */
  colSpan?: ColSpan
  className?: string
}

export interface InputItem<
  TValues extends FieldValues = FieldValues,
> extends BaseItem<TValues> {
  type: InputType
  autoComplete?: string
  min?: number
  max?: number
  step?: number
}

export interface TextareaItem<
  TValues extends FieldValues = FieldValues,
> extends BaseItem<TValues> {
  type: "textarea"
  rows?: number
}

export interface SelectItem<
  TValues extends FieldValues = FieldValues,
> extends BaseItem<TValues> {
  type: "select" | "multiselect"
  options: FormOption[]
  /** Text shown when the search matches no option. */
  emptyText?: string
}

export interface BooleanItem<
  TValues extends FieldValues = FieldValues,
> extends BaseItem<TValues> {
  type: "checkbox" | "switch"
}

export interface RadioItem<
  TValues extends FieldValues = FieldValues,
> extends BaseItem<TValues> {
  type: "radio"
  options: FormOption[]
  orientation?: "vertical" | "horizontal"
}

/**
 * Preset label: plain text, or a key into `FormMessages` (used by the
 * built-in presets so they follow the active language).
 */
type PresetLabel<TKey extends string> =
  { label: string; labelKey?: never } | { labelKey: TKey; label?: never }

/** A shortcut in the date popup. `value` runs on click, so "today" is fresh. */
export type DatePreset = PresetLabel<DatePresetKey> & { value: () => Date }

/** A shortcut in the date-range popup. */
export type DateRangePreset = PresetLabel<DateRangePresetKey> & {
  value: () => { from: Date; to: Date }
}

export interface DateItem<
  TValues extends FieldValues = FieldValues,
> extends BaseItem<TValues> {
  type: "date"
  /** date-fns format for the trigger label. Defaults to the form's `dateFormat` (`"PP"`). */
  dateFormat?: string
  /** Shortcuts shown next to the calendar. None by default, see `DATE_PRESETS`. */
  presets?: DatePreset[]
}

export interface DateRangeItem<
  TValues extends FieldValues = FieldValues,
> extends BaseItem<TValues> {
  type: "date-range"
  /** date-fns format for the trigger label and the From/To inputs. Defaults to the form's `dateFormat` (`"PP"`). */
  dateFormat?: string
  /** Shortcuts shown next to the calendar. None by default, see `DATE_RANGE_PRESETS`. */
  presets?: DateRangePreset[]
}

export type FormItemConfig<TValues extends FieldValues = FieldValues> =
  | InputItem<TValues>
  | TextareaItem<TValues>
  | SelectItem<TValues>
  | BooleanItem<TValues>
  | RadioItem<TValues>
  | DateItem<TValues>
  | DateRangeItem<TValues>

export type FormItemType = FormItemConfig["type"]

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

type ButtonProps = ComponentProps<typeof Button>

interface BaseAction {
  label: ReactNode
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
  icon?: ReactNode
  disabled?: boolean
  className?: string
}

export interface SubmitAction extends BaseAction {
  kind: "submit"
}

export interface ResetAction extends BaseAction {
  kind: "reset"
}

export interface ButtonAction extends BaseAction {
  kind: "button"
  onClick: () => void
}

export interface LinkAction extends BaseAction {
  kind: "link"
  href: string
}

export type FormAction = SubmitAction | ResetAction | ButtonAction | LinkAction

/** Anything that renders an anchor from `href` — `<a>`, `next/link`, … */
export type LinkComponent = ComponentType<
  { href: string; children?: ReactNode } & Record<string, unknown>
>
