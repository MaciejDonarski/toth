import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import type { ReactElement, ReactNode } from "react"

import { Toaster } from "@toth/ui/components/toast"

import { DEFAULT_LOCALE, TIME_ZONE } from "@/i18n/config"
import { MESSAGES } from "@/i18n/messages"
import { AppFormDefaults } from "@/ui/components/app-form-defaults"

/** Same providers as the root layout: messages + @toth/form defaults. */
export function IntlProviders({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider
      locale={DEFAULT_LOCALE}
      messages={MESSAGES[DEFAULT_LOCALE]}
      timeZone={TIME_ZONE}
    >
      <Toaster>
        <AppFormDefaults>{children}</AppFormDefaults>
      </Toaster>
    </NextIntlClientProvider>
  )
}

function renderWithIntl(
  ui: ReactElement,
  options?: RenderOptions
): RenderResult {
  return render(ui, { wrapper: IntlProviders, ...options })
}

// Drop-in replacement for @testing-library/react in component tests.
export * from "@testing-library/react"
export { renderWithIntl as render }
