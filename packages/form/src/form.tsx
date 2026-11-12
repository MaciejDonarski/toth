"use client"

import { useMemo, useState, type ComponentProps, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type UseFormProps,
} from "react-hook-form"
import type { z } from "zod"

import { cn } from "@toth/ui/lib/utils"

import { FormConfigContext, type FormLocaleSettings } from "./form-context"
import { applySubmitResult, type SubmitResult } from "./lib/submit"
import type { LinkComponent } from "./types"

type Values<TSchema extends z.ZodType> = z.input<TSchema> & object

export interface FormProps<TSchema extends z.ZodType>
  extends
    Omit<ComponentProps<"form">, "onSubmit" | "children">,
    FormLocaleSettings {
  /** Zod schema — validates input and produces the values passed to `onSubmit`. */
  schema: TSchema
  /** Initial values (schema input shape). */
  defaultValues?: DefaultValues<Values<TSchema>>
  /**
   * Called with the parsed values. May be async — the submit action shows a
   * spinner until it settles. Return `{ fieldErrors, formError }` to report
   * server-side failures.
   */
  onSubmit: (
    values: z.output<TSchema>
  ) =>
    | void
    | SubmitResult<Values<TSchema>>
    | Promise<void | SubmitResult<Values<TSchema>>>
  /** When validation runs. Defaults to `"onTouched"`. */
  mode?: UseFormProps["mode"]
  /** Component used for `link` actions in `FormActions` (e.g. `next/link`). */
  linkComponent?: LinkComponent
  children: ReactNode
}

function Form<TSchema extends z.ZodType>({
  schema,
  defaultValues,
  onSubmit,
  mode = "onTouched",
  linkComponent,
  locale,
  dateFormat,
  messages,
  className,
  children,
  ...props
}: FormProps<TSchema>) {
  const form = useForm<Values<TSchema>, unknown, z.output<TSchema>>({
    // The resolver's generics are inferred from the schema, which TS cannot
    // relate to the generic `Values<TSchema>` here.
    resolver: zodResolver(schema as never),
    defaultValues,
    mode,
  })
  const [formError, setFormError] = useState<string>()

  const submit = form.handleSubmit(async (values) => {
    setFormError(undefined)
    const result = await onSubmit(values)
    setFormError(applySubmitResult(result, form.setError))
  })

  const config = useMemo(
    () => ({
      linkComponent,
      formError,
      setFormError,
      locale,
      dateFormat,
      messages,
    }),
    [linkComponent, formError, locale, dateFormat, messages]
  )

  return (
    <FormProvider {...form}>
      <FormConfigContext value={config}>
        <form
          data-slot="form"
          noValidate
          className={cn("flex flex-col gap-6", className)}
          onSubmit={(event) => void submit(event)}
          {...props}
        >
          {children}
        </form>
      </FormConfigContext>
    </FormProvider>
  )
}

export { Form }
