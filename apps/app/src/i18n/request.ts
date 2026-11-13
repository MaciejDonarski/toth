import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"

import { DEFAULT_LOCALE, isAppLocale, LOCALE_COOKIE, TIME_ZONE } from "./config"
import { MESSAGES } from "./messages"

/** Locale from the `locale` cookie (no URL prefix), falling back to Polish. */
export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isAppLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
  return { locale, messages: MESSAGES[locale], timeZone: TIME_ZONE }
})
