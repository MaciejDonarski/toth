import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import * as React from "react"

import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetTitle,
} from "@toth/ui/components/sheet"
import { cn } from "@toth/ui/lib/utils"

import { useTableMessages } from "../../hooks/use-table-locale"
import { Button } from "../../internal/button"

// The panel a table opens beside its rows — the filters, a row's quick view.
//
// On a wide window it slides in from the right OVER the rows, inside the table: portalled into the
// table body, absolutely positioned, non-modal, no backdrop. The table keeps its width underneath —
// nothing reflows.
//
// DECISION: a press anywhere outside the panel closes it — on the rows, the toolbar, a chip, the
// page around the table — like any other popup; Escape, its close button and its own Done close it
// too. It replaces "a click on the rows does not close it": the filters apply as they are edited, so
// closing loses nothing, and a panel that stays up over the rows hides the very rows it changed.
// With `submitOnChange: false` an outside press is a close like Escape: the unapplied draft goes
// with the form, and the filtering in force is what the panel shows when it opens again.
//
// What does NOT count as outside:
//   - anything rendered from inside the panel, portals included — a dropdown's list, the
//     date-range calendar, a tooltip. Base UI follows the React tree, not the DOM, so a list
//     portalled to `<body>` from a filter field is still "inside"; `data-table.test.tsx` pins it
//     with the real filter panel;
//   - `isTrigger`: the controls that open a panel over these rows. The Filters button on an open
//     filter panel toggles it closed, rather than the press closing it and the click opening it
//     again; another row's eye switches the quick view to that row rather than closing and
//     reopening it. Those controls act on their own, so the panel leaves the press to them.
//
// A press outside does not pull focus back to the control that opened the panel — the press put it
// where the user wanted it. Escape, the close button and Done still return it.
//
// Below 768px there is no "beside": it covers the screen, sliding up from the bottom, and becomes
// modal there — the page under a full-screen panel must not scroll, and focus stays in it.
//
// The popup is Base UI's Dialog drawn with `@toth/ui`'s sheet look, rather than `SheetContent`
// itself: that one always portals to the body with a backdrop, and this panel has to be able to
// portal into the table and leave the rows uncovered.

export interface DataTableSheetProps {
  open: boolean
  onClose: () => void
  /** The table body to open over, on a wide window. `null` until it has mounted. */
  container: HTMLElement | null
  /** A phone-sized window: full screen from the bottom, modal. */
  isMobile: boolean
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Controls beside the close button — the quick view's previous / next arrows. */
  headerActions?: React.ReactNode
  footer?: React.ReactNode
  /** The accessible name of the close button, e.g. "Close filters". */
  closeLabel: string
  /** 28rem instead of 24rem. */
  wide?: boolean
  /** Where focus goes when the panel closes — the control that opened it. */
  returnFocus?: () => HTMLElement | null | undefined
  /**
   * A press on an element this returns `true` for does not close the panel — the controls that
   * open, toggle or switch it, which handle the press themselves.
   */
  isTrigger?: (target: Element) => boolean
  id?: string
  className?: string
  children: React.ReactNode
}

function DataTableSheet({
  open,
  onClose,
  container,
  isMobile,
  title,
  subtitle,
  headerActions,
  footer,
  closeLabel,
  wide = false,
  returnFocus,
  isTrigger,
  id,
  className,
  children,
}: DataTableSheetProps) {
  // Contained only once there is something to be contained in; a phone gets the viewport.
  const contained = !isMobile && container !== null
  // Read by `finalFocus` as the panel closes. Set by an outside press, and cleared whenever the
  // panel opens — a later close through Done or the Filters button never reaches `onOpenChange`,
  // and must not inherit an earlier press's answer.
  const closedByOutsidePressRef = React.useRef(false)
  const messages = useTableMessages()

  React.useEffect(() => {
    if (open) closedByOutsidePressRef.current = false
  }, [open])

  return (
    <Sheet
      open={open}
      onOpenChange={(next, details) => {
        if (next) return

        const outside = details.reason === "outside-press"
        const target = details.event?.target
        if (outside && target instanceof Element && isTrigger?.(target)) return

        closedByOutsidePressRef.current = outside
        onClose()
      }}
      modal={isMobile}
      // A phone's panel is modal and covers the screen: there is no outside to press, and it
      // keeps closing only through Escape, its close button and its own way out.
      disablePointerDismissal={isMobile}
    >
      <SheetPrimitive.Portal
        data-slot="sheet-portal"
        container={contained ? container : undefined}
      >
        {isMobile ? (
          <SheetPrimitive.Backdrop
            data-slot="sheet-overlay"
            className="fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"
          />
        ) : null}
        <SheetPrimitive.Popup
          id={id}
          data-slot="sheet-content"
          data-side={isMobile ? "bottom" : "right"}
          data-placement={contained ? "contained" : undefined}
          data-wide={wide || undefined}
          finalFocus={() =>
            closedByOutsidePressRef.current ? false : (returnFocus?.() ?? true)
          }
          className={cn(
            "z-50 flex flex-col bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0",
            // Beside the rows: from the right, over the table body when contained.
            "data-[side=right]:top-0 data-[side=right]:right-0 data-[side=right]:w-[min(24rem,100%)] data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-10 data-[side=right]:data-starting-style:translate-x-10 data-wide:data-[side=right]:w-[min(28rem,100%)]",
            "not-data-[placement=contained]:fixed data-[placement=contained]:absolute data-[placement=contained]:h-[min(100%,calc(100dvh-6rem))] not-data-[placement=contained]:data-[side=right]:h-full",
            // A phone: the whole screen, from the bottom.
            "data-[side=bottom]:inset-0 data-[side=bottom]:h-dvh data-[side=bottom]:w-full data-[side=bottom]:data-ending-style:translate-y-10 data-[side=bottom]:data-starting-style:translate-y-10",
            className
          )}
        >
          <div className="flex items-start gap-1 border-b py-2 pr-2 pl-4">
            <div className="min-w-0 flex-1 py-1.5">
              <SheetTitle className="flex items-center gap-2 text-base font-semibold">
                {title}
              </SheetTitle>
              {subtitle ? (
                <SheetDescription className="mt-0.5 truncate text-xs">
                  {subtitle}
                </SheetDescription>
              ) : null}
            </div>
            {headerActions}
            <SheetClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  icon="x"
                  aria-label={closeLabel}
                  title={messages.sheet.closeHint}
                />
              }
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {children}
          </div>
          {footer ? (
            <div className="flex flex-wrap items-center gap-2 border-t bg-muted/40 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
              {footer}
            </div>
          ) : null}
        </SheetPrimitive.Popup>
      </SheetPrimitive.Portal>
    </Sheet>
  )
}

export { DataTableSheet }
