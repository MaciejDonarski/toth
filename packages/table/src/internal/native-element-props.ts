import type * as React from "react"

/**
 * What Base UI's Button needs to know about a non-`<button>` render target:
 * anything else (an app's router link) is a link, so `nativeButton` is off and
 * the `link` role is restored. Spread it after `render`.
 */
export function nativeElementProps(
  element: React.ReactElement | undefined | null
) {
  if (!element || element.type === "button") return undefined
  return { nativeButton: false, role: "link" } as const
}
