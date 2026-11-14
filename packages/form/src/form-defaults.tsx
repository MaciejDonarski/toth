"use client"

import { use, useMemo, type ReactNode } from "react"

import { FormDefaultsContext, type FormLocaleSettings } from "./form-context"
import { mergeMessages } from "./lib/messages"

export interface FormDefaultsProviderProps extends FormLocaleSettings {
  children: ReactNode
}

/**
 * Sets language and date defaults for every `<Form>` below it, e.g. once in
 * the app layout. Nested providers override the outer one key by key;
 * `<Form>` props and field props override both.
 */
function FormDefaultsProvider({
  locale,
  dateFormat,
  messages,
  translateError,
  children,
}: FormDefaultsProviderProps) {
  const parent = use(FormDefaultsContext)
  const value = useMemo(
    () => ({
      locale: locale ?? parent.locale,
      dateFormat: dateFormat ?? parent.dateFormat,
      messages: mergeMessages(parent.messages, messages),
      translateError: translateError ?? parent.translateError,
    }),
    [locale, dateFormat, messages, translateError, parent]
  )
  return <FormDefaultsContext value={value}>{children}</FormDefaultsContext>
}

export { FormDefaultsProvider }
