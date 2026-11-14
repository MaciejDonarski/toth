import type * as React from "react"

import {
  Tooltip as TooltipRoot,
  TooltipContent,
  TooltipTrigger,
} from "@toth/ui/components/tooltip"
import { cn } from "@toth/ui/lib/utils"

import { Icon } from "./icon"

type ContentProps = React.ComponentProps<typeof TooltipContent>

export type TooltipProps = Pick<
  ContentProps,
  "side" | "sideOffset" | "align" | "alignOffset"
> & {
  /** The element the tooltip describes; rendered as the trigger. */
  trigger: React.ReactElement
  children: React.ReactNode
  className?: string
}

/** A tooltip as one element: `trigger` plus content. */
function Tooltip({ trigger, children, className, ...position }: TooltipProps) {
  return (
    <TooltipRoot>
      <TooltipTrigger render={trigger} />
      <TooltipContent className={className} {...position}>
        {children}
      </TooltipContent>
    </TooltipRoot>
  )
}

export type InfoTooltipProps = Omit<TooltipProps, "trigger"> & {
  /** Accessible name of the info icon. */
  label: string
}

/** An info glyph that explains something on hover or focus. */
function InfoTooltip({ label, className, ...props }: InfoTooltipProps) {
  return (
    <Tooltip
      {...props}
      className={cn("max-w-64 text-pretty", className)}
      trigger={
        <button
          type="button"
          aria-label={label}
          className="inline-flex cursor-help rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Icon icon="info" className="size-4" />
        </button>
      }
    />
  )
}

export { InfoTooltip, Tooltip }
