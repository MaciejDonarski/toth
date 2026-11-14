import * as React from "react"

/** Below this width a table's panels become full-screen sheets — the `md` breakpoint. */
const MOBILE_BREAKPOINT = 768

const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onStoreChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener("change", onStoreChange)
  return () => query.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

// No viewport on the server: the desktop layout is assumed and the first client render corrects it.
function getServerSnapshot() {
  return false
}

/**
 * Whether the window is phone-sized, read from `matchMedia` through `useSyncExternalStore` — so
 * the very first client render already knows, rather than rendering desktop and correcting it in an
 * effect the way `@toth/ui`'s `useIsMobile` does.
 */
function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export { MOBILE_BREAKPOINT, useIsMobile }
