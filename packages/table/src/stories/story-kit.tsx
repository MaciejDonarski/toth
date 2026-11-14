// Story-only helpers: the handful of things the stories draw that are not part of the table —
// status pills, a description list, a card and inline form cells — built from @toth/ui and
// @toth/form so the stories look like the app.
import type * as React from "react"

import { FormItem, type FormOption } from "@toth/form"
import { Badge } from "@toth/ui/components/badge"
import { Card, CardContent } from "@toth/ui/components/card"
import { cn } from "@toth/ui/lib/utils"

export type Tone = "gray" | "secondary" | "warning" | "success" | "destructive"

const TONE_CLASS: Record<Tone, string> = {
  gray: "",
  secondary: "",
  warning:
    "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  success:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  destructive: "",
}

/** A status pill in one of the tones the stories use. */
export function ToneBadge({
  tone,
  children,
}: {
  tone: Tone
  children: React.ReactNode
}) {
  return (
    <Badge
      variant={
        tone === "destructive"
          ? "destructive"
          : tone === "gray" || tone === "secondary"
            ? "secondary"
            : "default"
      }
      className={TONE_CLASS[tone]}
    >
      {children}
    </Badge>
  )
}

export interface DescriptionItem<TData> {
  key: keyof TData & string
  term: React.ReactNode
  render?: (value: TData[keyof TData]) => React.ReactNode
}

/** Term / value pairs, read off `data` by key. */
export function DescriptionList<TData extends object>({
  data,
  items,
}: {
  data: TData
  items: DescriptionItem<TData>[]
}) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {items.map((item) => (
        <div key={item.key} className="contents">
          <dt className="text-muted-foreground">{item.term}</dt>
          <dd className="m-0">
            {item.render
              ? item.render(data[item.key])
              : String(data[item.key] ?? "")}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** The card a table can sit in. */
export function StoryCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="py-0">
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}

/** A field inside a table cell: no visible label (the column header is it), one for a screen reader. */
export function CellField({
  name,
  label,
  type = "text",
  options,
  min,
}: {
  name: string
  label: string
  type?: "text" | "number" | "select"
  options?: FormOption[]
  min?: number
}) {
  const srLabel = <span className="sr-only">{label}</span>
  const className = cn("gap-0")

  return type === "select" ? (
    <FormItem
      name={name}
      type="select"
      label={srLabel}
      options={options ?? []}
      className={className}
    />
  ) : (
    <FormItem
      name={name}
      type={type}
      label={srLabel}
      min={min}
      className={className}
    />
  )
}

/** Utility classes in place of the old storybook helpers. */
export const sb = {
  col: "flex flex-col gap-4",
  row: "flex items-center gap-2",
  muted: "text-sm text-muted-foreground",
  strong: "text-xl font-semibold",
  wMd: "w-fit",
  resizable: "resize-x overflow-auto rounded-md border p-2",
  states: "grid gap-6",
  stateLabel: "mb-2 text-xs font-medium text-muted-foreground",
} as const
