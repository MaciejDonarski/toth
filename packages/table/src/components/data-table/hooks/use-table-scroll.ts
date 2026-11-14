import type { PlainTableHandle } from "../../plain-table/types"
import { useTableStorage } from "../../../hooks/use-table-storage"
import * as React from "react"

type StoredScroll = { scrollLeft?: number; scrollTop?: number }

export interface UseTableScrollOptions {
  tableId?: string
  storageKey: string
  userId?: string | number
  persistState?: boolean
  /** The table whose scroll container this follows. */
  handleRef: React.RefObject<PlainTableHandle | null>
  /** While rows are still arriving the container has nothing to scroll to yet. */
  loading?: boolean
}

/**
 * Remembers where the table was scrolled to, and puts it back on the next visit.
 *
 * A wide table is usually scrolled sideways to the columns someone actually works in, and losing
 * that on every navigation is a small tax paid many times a day.
 *
 * Restoring waits for a frame after the rows are in: the container has no scrollable width until
 * the colgroup has been laid out, and setting `scrollLeft` before that silently does nothing. It
 * happens once per mount — after that the user's own scrolling is what is recorded, and a second
 * restore would fight them.
 */
export function useTableScroll(options: UseTableScrollOptions) {
  const {
    tableId,
    storageKey,
    userId,
    persistState = false,
    handleRef,
    loading = false,
  } = options

  const { read, write } = useTableStorage<StoredScroll>(
    storageKey,
    tableId,
    "scroll",
    userId,
    persistState
  )

  const hasRestoredRef = React.useRef(false)

  React.useEffect(() => {
    if (loading) return undefined

    const element = handleRef.current?.wrapperRef.current
    if (!element) return undefined

    let frame: number | null = null

    if (!hasRestoredRef.current) {
      const stored = read()

      if (stored.scrollLeft || stored.scrollTop) {
        frame = requestAnimationFrame(() => {
          frame = null
          element.scrollTo({
            left: stored.scrollLeft ?? 0,
            top: stored.scrollTop ?? 0,
          })
          hasRestoredRef.current = true
        })
      } else {
        hasRestoredRef.current = true
      }
    }

    // Recording only starts once the restore has landed, or the programmatic scroll would be
    // recorded as the user's — harmless here, but it would also record the 0,0 the container
    // sits at beforehand and overwrite the position being restored.
    const onScroll = () => {
      if (!hasRestoredRef.current) return

      write({ scrollLeft: element.scrollLeft, scrollTop: element.scrollTop })
    }

    element.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)

      element.removeEventListener("scroll", onScroll)
    }
  }, [loading, handleRef, read, write])

  const resetScroll = React.useCallback(() => {
    write({ scrollLeft: 0, scrollTop: 0 })
    handleRef.current?.wrapperRef.current?.scrollTo({ left: 0, top: 0 })
  }, [write, handleRef])

  return { resetScroll }
}
