import { createTranslator } from "next-intl"

import { DEFAULT_LOCALE } from "@/i18n/config"
import { MESSAGES } from "@/i18n/messages"

/**
 * `vi.mock("next-intl/server", () => intlServerMock())` for server
 * components and actions rendered directly in tests.
 */
export function intlServerMock() {
  const getTranslations = async (
    arg?: string | { namespace?: string; locale?: string }
  ) => {
    const namespace = typeof arg === "string" ? arg : arg?.namespace
    return createTranslator({
      locale: DEFAULT_LOCALE,
      messages: MESSAGES[DEFAULT_LOCALE],
      namespace: namespace as never,
    })
  }
  return {
    getTranslations,
    getLocale: async () => DEFAULT_LOCALE,
  }
}
