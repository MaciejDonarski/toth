import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import type { Messages } from "./messages"

type PageTitleKey = Exclude<
  keyof Messages["metadata"],
  "appTitle" | "titleTemplate" | "description"
>

/**
 * `generateMetadata` for a page whose title is `metadata.<key>`:
 * `export const generateMetadata = translatedMetadata("login")`.
 */
export function translatedMetadata(key: PageTitleKey, extra: Metadata = {}) {
  return async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("metadata")
    return { ...extra, title: t(key) }
  }
}
