"use client"

import { createContext, use } from "react"

import type { LinkComponent } from "./types"

export interface FormConfig {
  /** Renders `link` actions. Defaults to a plain `<a>`. */
  linkComponent?: LinkComponent
  /** Form-level error returned from the last `onSubmit`. */
  formError?: string
  setFormError?: (error: string | undefined) => void
}

export const FormConfigContext = createContext<FormConfig>({})

export function useFormConfig(): FormConfig {
  return use(FormConfigContext)
}
