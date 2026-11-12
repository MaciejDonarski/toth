"use client"

import type { ComponentProps, ReactNode } from "react"
import type { FieldValues } from "react-hook-form"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@toth/ui/components/card"
import { cn } from "@toth/ui/lib/utils"

import { FormItem } from "./form-item"
import type { FormItemConfig } from "./types"

export interface FormSectionProps<
  TValues extends FieldValues = FieldValues,
> extends Omit<ComponentProps<"section">, "title" | "children"> {
  title?: ReactNode
  description?: ReactNode
  /** Wrap the section in a `Card`. */
  card?: boolean
  /** Fields laid out on a 12-column grid via each item's `colSpan`. */
  items?: FormItemConfig<TValues>[]
  /** Rendered in the same grid, after `items`. Use `colSpan` on `FormItem`. */
  children?: ReactNode
  /** Extra classes for the grid container. */
  gridClassName?: string
}

function FormSection<TValues extends FieldValues = FieldValues>({
  title,
  description,
  card = false,
  items,
  children,
  className,
  gridClassName,
  ...props
}: FormSectionProps<TValues>) {
  const grid = (
    <div
      data-slot="form-section-grid"
      className={cn("grid grid-cols-12 gap-x-4 gap-y-6", gridClassName)}
    >
      {items?.map((item) => (
        <FormItem<TValues> key={item.name} {...item} />
      ))}
      {children}
    </div>
  )
  const hasHeader = Boolean(title ?? description)

  if (card) {
    return (
      <section data-slot="form-section" className={className} {...props}>
        <Card>
          {hasHeader && (
            <CardHeader>
              {title && (
                <CardTitle role="heading" aria-level={3}>
                  {title}
                </CardTitle>
              )}
              {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
          )}
          <CardContent>{grid}</CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section
      data-slot="form-section"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      {hasHeader && (
        <header className="flex flex-col gap-1">
          {title && (
            <h3 className="font-heading text-base leading-normal font-medium">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </header>
      )}
      {grid}
    </section>
  )
}

export { FormSection }
