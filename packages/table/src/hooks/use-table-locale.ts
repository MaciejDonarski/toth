import type { Locale } from "date-fns"
import * as React from "react"

import { DataTableConfigContext } from "../lib/data-table-config-context"
import { enMessages, mergeMessages, type TableMessages } from "../lib/messages"

export interface ResolvedTableLocale {
  locale?: Locale
  dateFormat: string
  dateTimeFormat: string
  messages: TableMessages
}

const DEFAULT_LOCALE: ResolvedTableLocale = {
  dateFormat: "PP",
  dateTimeFormat: "PPp",
  messages: enMessages,
}

/**
 * Language and date settings in effect for a table part: the nearest
 * `<DataTableConfigProvider>` wins key by key over the English defaults.
 */
function useTableLocale(): ResolvedTableLocale {
  const config = React.use(DataTableConfigContext)

  return React.useMemo(() => {
    if (!config) return DEFAULT_LOCALE
    return {
      locale: config.locale,
      dateFormat: config.dateFormat ?? DEFAULT_LOCALE.dateFormat,
      dateTimeFormat: config.dateTimeFormat ?? DEFAULT_LOCALE.dateTimeFormat,
      messages: config.messages
        ? (mergeMessages(enMessages, config.messages) as TableMessages)
        : enMessages,
    }
  }, [config])
}

/** Shorthand for `useTableLocale().messages`. */
function useTableMessages(): TableMessages {
  return useTableLocale().messages
}

export { useTableLocale, useTableMessages }
