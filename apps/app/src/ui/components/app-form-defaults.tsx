"use client"

import "@/ui/zod-locale"

import { useCallback } from "react"
import { useLocale, useTranslations } from "next-intl"

import {
  FormDefaultsProvider,
  plLocale,
  plMessages,
  type FormLocaleSettings,
} from "@toth/form"

import type { AppLocale } from "@/i18n/config"

/** Per app locale: calendar locale, date format and @toth/form UI strings. */
const FORM_LOCALES: Record<
  AppLocale,
  Omit<FormLocaleSettings, "translateError">
> = {
  pl: { locale: plLocale, dateFormat: "dd.MM.yyyy", messages: plMessages },
}

/**
 * Locale defaults for every `@toth/form` form, plus `translateError`: schema
 * and server field errors are message keys, translated here. A client
 * component because the date-fns locale holds functions, which cannot cross
 * the server/client boundary as props.
 */
export function AppFormDefaults({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const t = useTranslations()
  const translateError = useCallback(
    (message: string) =>
      // Keys come from schemas/servers at runtime, hence the untyped lookup.
      t.has(message as Parameters<typeof t.has>[0])
        ? t(message as Parameters<typeof t>[0])
        : message,
    [t]
  )

  return (
    <FormDefaultsProvider
      {...FORM_LOCALES[locale]}
      translateError={translateError}
    >
      {children}
    </FormDefaultsProvider>
  )
}
