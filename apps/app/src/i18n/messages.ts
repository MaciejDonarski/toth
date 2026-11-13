import type { AppLocale } from "./config"
import pl from "./messages/pl.json"

/**
 * Every message catalog, statically imported so server code outside React
 * (emails) can translate too. `pl` is the reference for the key structure.
 */
export const MESSAGES: Readonly<Record<AppLocale, typeof pl>> = { pl }

export type Messages = typeof pl
