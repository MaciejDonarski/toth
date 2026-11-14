import { useTableStorage } from "../../../hooks/use-table-storage"
import * as React from "react"

import {
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_MAX_WIDTH,
  DEFAULT_MIN_WIDTH,
  KEYBOARD_RESIZE_STEP,
} from "../constants"
import type { PlainTableColumn, PlainTableResizeHandlers } from "../types"

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** A column's own drag limits, falling back to the table-wide ones. */
function limitsOf<TRow>(
  column: PlainTableColumn<TRow> | undefined,
  fallbackMin: number,
  fallbackMax: number
) {
  return {
    min: column?.minWidth ?? fallbackMin,
    max: column?.maxWidth ?? fallbackMax,
  }
}

/**
 * An element's content-box width, re-measured on resize. `null` until the first measurement, so a
 * caller can tell "not measured yet" apart from "genuinely zero" and hold off acting on it.
 *
 * Coalesced into an animation frame like `useTableHeightFit`'s measurement: a `ResizeObserver`
 * callback that writes state which changes layout is how you get "ResizeObserver loop completed
 * with undelivered notifications" in the console.
 */
function useElementWidth(
  ref: React.RefObject<HTMLElement | null>
): number | null {
  const [width, setWidth] = React.useState<number | null>(null)

  React.useEffect(() => {
    const element = ref.current
    // jsdom (and any environment this old) has no `ResizeObserver` at all — falling back to
    // "not measured" leaves the colgroup at each column's natural width, the same as before
    // this hook existed, rather than throwing every table off the page.
    if (!element || typeof ResizeObserver === "undefined") return undefined

    let frame: number | null = null

    const measure = () => {
      if (frame !== null) cancelAnimationFrame(frame)

      frame = requestAnimationFrame(() => {
        frame = null
        setWidth(element.clientWidth)
      })
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [ref])

  return width
}

export type ColumnWidthMap = Record<string, number>

export interface ColumnResizeEndEvent {
  columnId: string
  width: number
  /** Every override after this change, i.e. exactly what was persisted. */
  widths: ColumnWidthMap
}

export interface UseResizableColumnsOptions {
  tableId?: string
  storageKey: string
  userId?: string | number
  persistState?: boolean
  onResizeEnd?: (event: ColumnResizeEndEvent) => void
  /** Table-wide drag limits, for columns that do not set their own. */
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
}

interface DragState {
  pointerId: number
  columnId: string
  startX: number
  startWidth: number
  min: number
  max: number
  /** The wrapper's viewport edges, so the pointer cannot drag past the visible table. */
  wrapperLeft: number
  wrapperRight: number
  /** Right edge of the dragged header cell, in the wrapper's scrolled content space. */
  anchor: number | null
  pendingWidth: number
}

/**
 * Column widths, the drag that changes them, and the preview line that follows the pointer.
 *
 * Widths are authoritative rather than measured: the table renders `table-layout: fixed` with a
 * `<colgroup>` built from here, so what this hook returns is what the browser lays out. That is
 * also what lets `useStickyColumns` compute pin offsets without touching the DOM.
 *
 * The drag runs on pointer events with pointer capture, so the handle keeps receiving moves once
 * the cursor leaves it and the browser cancels the gesture for us on interruption — no
 * window-level listeners to register, leak, or clean up. Touch and pen never reach it because
 * the handle is `display: none` under `(pointer: coarse)`; that CSS is the only gate.
 */
export function useResizableColumns<TRow>(
  columns: PlainTableColumn<TRow>[],
  wrapperRef: React.RefObject<HTMLDivElement | null>,
  options: UseResizableColumnsOptions
) {
  const {
    tableId,
    storageKey,
    userId,
    persistState,
    onResizeEnd,
    minWidth: fallbackMin = DEFAULT_MIN_WIDTH,
    maxWidth: fallbackMax = DEFAULT_MAX_WIDTH,
    defaultWidth: fallbackWidth = DEFAULT_COLUMN_WIDTH,
  } = options

  const { read, write } = useTableStorage<ColumnWidthMap>(
    storageKey,
    tableId,
    "columnWidth",
    userId,
    persistState
  )

  // Read once, on mount — see the same note in useColumnAlign.
  const [overrides, setOverrides] = React.useState<ColumnWidthMap>(() => read())
  const [activeColumn, setActiveColumn] = React.useState<string | null>(null)
  const [dragLine, setDragLine] = React.useState<number | null>(null)
  const [dragLimit, setDragLimit] = React.useState<"min" | "max" | null>(null)

  // The one genuinely mutable thing here: a gesture in flight, written and read only by the
  // pointer handlers. Everything else is state the handlers close over — React invokes the
  // handler from the latest render, so there is no stale closure to work around and no need for
  // the ref mirrors the old hook kept.
  const dragRef = React.useRef<DragState | null>(null)

  const getColumn = React.useCallback(
    (columnId: string) => columns.find((column) => column.id === columnId),
    [columns]
  )

  const getColumnWidth = React.useCallback(
    (columnId: string): number => {
      const column = columns.find((candidate) => candidate.id === columnId)
      const { min, max } = limitsOf(column, fallbackMin, fallbackMax)
      const base = overrides[columnId] ?? column?.defaultWidth ?? fallbackWidth

      return clamp(base, min, max)
    },
    [columns, overrides, fallbackMin, fallbackMax, fallbackWidth]
  )

  // How much room the wrapper actually has, so a table narrower than its container can be
  // stretched to fill it — see `naturalColgroup` below for why this cannot be done in CSS.
  const wrapperWidth = useElementWidth(wrapperRef)

  const naturalColgroup = React.useMemo(
    () =>
      columns.map((column) => {
        const { min, max } = limitsOf(column, fallbackMin, fallbackMax)
        return { id: column.id, width: getColumnWidth(column.id), min, max }
      }),
    [columns, getColumnWidth, fallbackMin, fallbackMax]
  )

  // `table-layout: fixed` only ever stretches EVERY column by the same ratio to fill the table's
  // own `width` — there is no `min`/`max-width` a column (or its `<col>`) can set to opt out, on
  // any browser this was tried against. A column with `min === max` (the two synthetic ones
  // `DataTable` adds, or any caller's own) is telling the table it has exactly one width, ever —
  // so the slack that fills a table narrower than its wrapper is handed only to the columns that
  // did NOT say that, in proportion to their own natural width.
  const computedColgroup = React.useMemo(() => {
    const naturalTotal = naturalColgroup.reduce(
      (total, column) => total + column.width,
      0
    )
    const slack = wrapperWidth !== null ? wrapperWidth - naturalTotal : 0

    if (slack <= 0) {
      return naturalColgroup.map(({ id, width }) => ({ id, width }))
    }

    const flexTotal = naturalColgroup.reduce(
      (total, column) =>
        column.min === column.max ? total : total + column.width,
      0
    )

    if (flexTotal === 0) {
      return naturalColgroup.map(({ id, width }) => ({ id, width }))
    }

    return naturalColgroup.map(({ id, width, min, max }) => ({
      id,
      width: min === max ? width : width + (slack * width) / flexTotal,
    }))
  }, [naturalColgroup, wrapperWidth])

  // Keyed on the widths themselves rather than on the array. The first measurement of the
  // wrapper lands after mount, and when it leaves every width where it was — the common case: a
  // table wider than its wrapper has no slack to hand out — a new array would still hand
  // `useStickyColumns` a new identity, and through it every memoised row a new
  // `getStickyProps`: one full re-render of the body for nothing. A `useMemo` on a primitive
  // needs no ref written during render to tell the two apart.
  const colgroupKey = JSON.stringify(computedColgroup)
  const colgroup = React.useMemo<{ id: string; width: number }[]>(
    () => JSON.parse(colgroupKey),
    [colgroupKey]
  )

  const tableWidth = React.useMemo(
    () => colgroup.reduce((total, column) => total + column.width, 0),
    [colgroup]
  )

  // Commits outside the state updater, never inside one — a persisted write and an
  // `onResizeEnd` are side effects, and an updater may run more than once per commit.
  const applyWidths = React.useCallback(
    (next: ColumnWidthMap, event?: ColumnResizeEndEvent) => {
      setOverrides(next)
      write(next)

      if (event) onResizeEnd?.(event)
    },
    [write, onResizeEnd]
  )

  const setColumnWidth = React.useCallback(
    (columnId: string, width: number) => {
      const next = { ...overrides, [columnId]: width }
      applyWidths(next, { columnId, width, widths: next })
    },
    [applyWidths, overrides]
  )

  const resetColumnWidth = React.useCallback(
    (columnId: string) => {
      if (!(columnId in overrides)) return

      const next = { ...overrides }
      delete next[columnId]
      applyWidths(next)
    },
    [applyWidths, overrides]
  )

  const resetWidths = React.useCallback(() => {
    if (Object.keys(overrides).length === 0) return

    applyWidths({})
  }, [applyWidths, overrides])

  const endDrag = React.useCallback(() => {
    const drag = dragRef.current
    dragRef.current = null

    setActiveColumn(null)
    setDragLine(null)
    setDragLimit(null)

    document.body.style.cursor = ""
    document.body.style.userSelect = ""

    if (drag && drag.pendingWidth !== drag.startWidth) {
      setColumnWidth(drag.columnId, drag.pendingWidth)
    }
  }, [setColumnWidth])

  // A drag interrupted by unmount would otherwise leave the whole document stuck showing a
  // col-resize cursor and refusing to select text.
  React.useEffect(
    () => () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    },
    []
  )

  const getResizeHandlers = React.useCallback(
    (columnId: string): PlainTableResizeHandlers => ({
      // The width the user set, not the stretched one: it is what the arrow keys step and
      // what the limits bound, so it is the only value the three can agree on.
      "aria-valuenow": getColumnWidth(columnId),
      "aria-valuemin": limitsOf(getColumn(columnId), fallbackMin, fallbackMax)
        .min,
      "aria-valuemax": limitsOf(getColumn(columnId), fallbackMin, fallbackMax)
        .max,

      onPointerDown: (event) => {
        if (event.button !== 0 || dragRef.current) return

        const column = getColumn(columnId)
        if (!column?.isResizable) return

        const wrapper = wrapperRef.current
        if (!wrapper) return

        event.preventDefault()
        event.stopPropagation()

        const handle = event.currentTarget
        handle.setPointerCapture(event.pointerId)

        const wrapperRect = wrapper.getBoundingClientRect()
        const headerRect = handle.closest("th")?.getBoundingClientRect() ?? null
        const startWidth = getColumnWidth(columnId)
        const { min, max } = limitsOf(column, fallbackMin, fallbackMax)
        const anchor = headerRect
          ? headerRect.right - wrapperRect.left + wrapper.scrollLeft
          : null

        dragRef.current = {
          pointerId: event.pointerId,
          columnId,
          startX: event.clientX,
          startWidth,
          min,
          max,
          wrapperLeft: wrapperRect.left,
          wrapperRight: wrapperRect.right,
          anchor,
          pendingWidth: startWidth,
        }

        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"

        setActiveColumn(columnId)
        if (anchor !== null) setDragLine(anchor)
      },

      onPointerMove: (event) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return

        event.preventDefault()

        // Clamped to the wrapper, so dragging off the side of the table stops tracking
        // instead of racing away past the last visible column.
        const clientX = clamp(
          event.clientX,
          drag.wrapperLeft,
          drag.wrapperRight
        )
        const rawWidth = drag.startWidth + (clientX - drag.startX)
        const nextWidth = clamp(rawWidth, drag.min, drag.max)

        drag.pendingWidth = nextWidth

        setDragLimit(
          rawWidth < drag.min ? "min" : rawWidth > drag.max ? "max" : null
        )

        if (drag.anchor !== null) {
          setDragLine(drag.anchor + (nextWidth - drag.startWidth))
        }
      },

      onPointerUp: (event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return
        endDrag()
      },

      // Fires when the browser takes the gesture over — a system swipe, a lost capture.
      onPointerCancel: (event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return
        endDrag()
      },

      onDoubleClick: () => resetColumnWidth(columnId),

      // Keyboard resizing, which the old handle had none of: it was a plain div with mouse
      // handlers, so the column width was simply out of reach without a pointer.
      onKeyDown: (event) => {
        const column = getColumn(columnId)
        if (!column?.isResizable) return

        if (event.key === "Home") {
          event.preventDefault()
          resetColumnWidth(columnId)
          return
        }

        const direction =
          event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0
        if (direction === 0) return

        event.preventDefault()

        const { min, max } = limitsOf(column, fallbackMin, fallbackMax)
        const current = getColumnWidth(columnId)
        const next = clamp(current + direction * KEYBOARD_RESIZE_STEP, min, max)

        if (next !== current) setColumnWidth(columnId, next)
      },
    }),
    [
      getColumn,
      getColumnWidth,
      wrapperRef,
      endDrag,
      resetColumnWidth,
      setColumnWidth,
      fallbackMin,
      fallbackMax,
    ]
  )

  return {
    colgroup,
    tableWidth,
    activeColumn,
    isResizing: activeColumn !== null,
    dragLine,
    dragLimit,
    getColumnWidth,
    setColumnWidth,
    resetColumnWidth,
    resetWidths,
    getResizeHandlers,
    widths: overrides,
  }
}
