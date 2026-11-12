"use client"

import { createContext, use, useMemo } from "react"
import type { Locale } from "react-day-picker"

import { enMessages, mergeMessages, type FormMessages } from "./lib/messages"
import type { FormMessagesInput } from "./lib/messages"
import type { LinkComponent } from "./types"

/** Language and date settings, set app-wide or per `<Form>`. */
export interface FormLocaleSettings {
  /**
   * date-fns locale for formatting, parsing and the calendar. A locale from
   * `react-day-picker/locale` (or `plLocale`) also translates calendar labels.
   * Defaults to en-US.
   */
  locale?: Locale
  /** Default date-fns format for date fields. Defaults to `"PP"`. */
  dateFormat?: string
  /** UI strings; missing keys fall back to English. */
  messages?: FormMessagesInput
}

export interface FormConfig extends FormLocaleSettings {
  /** Renders `link` actions. Defaults to a plain `<a>`. */
  linkComponent?: LinkComponent
  /** Form-level error returned from the last `onSubmit`. */
  formError?: string
  setFormError?: (error: string | undefined) => void
}

export const FormConfigContext = createContext<FormConfig>({})

/** App-wide settings from `FormDefaultsProvider`. */
export const FormDefaultsContext = createContext<FormLocaleSettings>({})

export function useFormConfig(): FormConfig {
  return use(FormConfigContext)
}

export interface ResolvedFormLocale {
  locale?: Locale
  dateFormat: string
  messages: FormMessages
}

/**
 * Locale settings in effect for a field: `<Form>` props win over
 * `FormDefaultsProvider`, which wins over the English defaults.
 */
export function useFormLocale(): ResolvedFormLocale {
  const defaults = use(FormDefaultsContext)
  const config = use(FormConfigContext)
  return useMemo(
    () => ({
      locale: config.locale ?? defaults.locale,
      dateFormat: config.dateFormat ?? defaults.dateFormat ?? "PP",
      messages: mergeMessages(
        enMessages,
        defaults.messages,
        config.messages
      ) as FormMessages,
    }),
    [
      config.locale,
      config.dateFormat,
      config.messages,
      defaults.locale,
      defaults.dateFormat,
      defaults.messages,
    ]
  )
}
