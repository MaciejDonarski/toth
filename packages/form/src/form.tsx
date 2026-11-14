"use client"

import { useMemo, useState, type ComponentProps, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form"
import type { z } from "zod"

import { cn } from "@toth/ui/lib/utils"

import { FormConfigContext, type FormLocaleSettings } from "./form-context"
import { applySubmitResult, type SubmitResult } from "./lib/submit"
import type { LinkComponent } from "./types"

type Values<TSchema extends z.ZodType> = z.input<TSchema> & object

interface FormBaseProps
  extends
    Omit<ComponentProps<"form">, "onSubmit" | "children">,
    FormLocaleSettings {
  /** Component used for `link` actions in `FormActions` (e.g. `next/link`). */
  linkComponent?: LinkComponent
  children: ReactNode
}

export interface FormProps<TSchema extends z.ZodType> extends FormBaseProps {
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
  form?: never
}

/**
 * A `<Form>` around a react-hook-form instance the caller owns: no schema, no
 * resolver. For forms whose values are state rather than a submission that
 * can fail, e.g. a filter panel that reads values with `useWatch`.
 */
export interface ProvidedFormProps<
  TValues extends FieldValues = FieldValues,
> extends FormBaseProps {
  /** The caller's `useForm()` result. */
  form: UseFormReturn<TValues>
  /** Called with the current values when the form is submitted. */
  onSubmit?: (
    values: TValues
  ) => void | SubmitResult<TValues> | Promise<void | SubmitResult<TValues>>
  schema?: never
  defaultValues?: never
  mode?: never
}

function Form<
  TSchema extends z.ZodType,
  TValues extends FieldValues = FieldValues,
>(props: FormProps<TSchema> | ProvidedFormProps<TValues>) {
  if (props.form) {
    const { form, onSubmit, ...rest } = props
    return <FormShell form={form} onSubmit={onSubmit} {...rest} />
  }
  return <ManagedForm {...(props as FormProps<TSchema>)} />
}

function ManagedForm<TSchema extends z.ZodType>({
  schema,
  defaultValues,
  onSubmit,
  mode = "onTouched",
  ...rest
}: FormProps<TSchema>) {
  const form = useForm<Values<TSchema>, unknown, z.output<TSchema>>({
    // The resolver's generics are inferred from the schema, which TS cannot
    // relate to the generic `Values<TSchema>` here.
    resolver: zodResolver(schema as never),
    defaultValues,
    mode,
  })
  return (
    <FormShell
      form={form as unknown as UseFormReturn<FieldValues>}
      onSubmit={
        onSubmit as unknown as ProvidedFormProps<FieldValues>["onSubmit"]
      }
      {...rest}
    />
  )
}

function FormShell<TValues extends FieldValues>({
  form,
  onSubmit,
  linkComponent,
  locale,
  dateFormat,
  messages,
  translateError,
  className,
  children,
  ...props
}: Omit<ProvidedFormProps<TValues>, "schema" | "defaultValues" | "mode">) {
  const [formError, setFormError] = useState<string>()

  const submit = form.handleSubmit(async (values) => {
    setFormError(undefined)
    const result = await onSubmit?.(values)
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
      translateError,
    }),
    [linkComponent, formError, locale, dateFormat, messages, translateError]
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
