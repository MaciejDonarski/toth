"use client"

import "@/ui/zod-locale"

import { FormDefaultsProvider, plLocale, plMessages } from "@toth/form"

/**
 * Polish defaults for every `@toth/form` form. A client component because the
 * date-fns locale holds functions, which cannot cross the server/client
 * boundary as props.
 */
export function AppFormDefaults({ children }: { children: React.ReactNode }) {
  return (
    <FormDefaultsProvider
      locale={plLocale}
      dateFormat="dd.MM.yyyy"
      messages={plMessages}
    >
      {children}
    </FormDefaultsProvider>
  )
}
