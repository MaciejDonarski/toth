"use client"

import { useId, type ComponentType } from "react"
import { useController, type FieldValues } from "react-hook-form"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@toth/ui/components/field"
import { cn } from "@toth/ui/lib/utils"

import { BooleanField } from "./fields/boolean-field"
import { DateField } from "./fields/date-field"
import { DateRangeField } from "./fields/date-range-field"
import type { FieldRendererProps } from "./fields/field-props"
import { InputField } from "./fields/input-field"
import { RadioField } from "./fields/radio-field"
import { SelectField } from "./fields/select-field"
import { TextareaField } from "./fields/textarea-field"
import { colSpanClassName } from "./lib/grid"
import type { FormItemConfig, FormItemType } from "./types"

type AnyRenderer = ComponentType<FieldRendererProps<FormItemConfig>>

const RENDERERS = {
  text: InputField,
  email: InputField,
  password: InputField,
  number: InputField,
  tel: InputField,
  url: InputField,
  textarea: TextareaField,
  select: SelectField,
  multiselect: SelectField,
  checkbox: BooleanField,
  switch: BooleanField,
  radio: RadioField,
  date: DateField,
  "date-range": DateRangeField,
} satisfies Record<FormItemType, unknown> as unknown as Record<
  FormItemType,
  AnyRenderer
>

export type FormItemProps<TValues extends FieldValues = FieldValues> =
  FormItemConfig<TValues>

function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-destructive">
      *
    </span>
  )
}

/**
 * A single form field bound to react-hook-form by `name`. Picks the control
 * from `type` and renders label, description and validation error around it.
 * Must be rendered inside `<Form>`.
 */
function FormItem<TValues extends FieldValues = FieldValues>(
  props: FormItemProps<TValues>
) {
  const { name, label, description, required, colSpan, className } = props
  const {
    field: { ref: inputRef, ...field },
    fieldState,
  } = useController({ name })

  const id = useId()
  const labelId = `${id}-label`
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = fieldState.error ? `${id}-error` : undefined
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined

  const Renderer = RENDERERS[props.type]
  const control = (
    <Renderer
      item={props as FormItemConfig}
      field={field}
      inputRef={inputRef}
      fieldState={fieldState}
      id={id}
      labelId={labelId}
      describedBy={describedBy}
    />
  )
  const labelContent = (
    <>
      {label}
      {required && <RequiredMark />}
    </>
  )
  const descriptionNode = description && (
    <FieldDescription id={descriptionId}>{description}</FieldDescription>
  )
  const errorNode = <FieldError id={errorId} errors={[fieldState.error]} />
  const fieldProps = {
    "data-invalid": fieldState.invalid || undefined,
    "data-disabled": props.disabled || undefined,
    "data-type": props.type,
    className: cn(colSpanClassName(colSpan), className),
  }

  if (props.type === "checkbox" || props.type === "switch") {
    return (
      <Field orientation="horizontal" {...fieldProps}>
        {control}
        <FieldContent>
          <FieldLabel id={labelId} htmlFor={id}>
            {labelContent}
          </FieldLabel>
          {descriptionNode}
          {errorNode}
        </FieldContent>
      </Field>
    )
  }

  return (
    <Field {...fieldProps}>
      {props.type === "radio" ? (
        // A radio group is not labelable, so it is named via aria-labelledby.
        <FieldTitle id={labelId}>{labelContent}</FieldTitle>
      ) : (
        <FieldLabel id={labelId} htmlFor={id}>
          {labelContent}
        </FieldLabel>
      )}
      {control}
      {descriptionNode}
      {errorNode}
    </Field>
  )
}

/**
 * Typed helper for item arrays: `defineFormItems<FormValues>()([...])`
 * checks every `name` against the form values.
 */
function defineFormItems<TValues extends FieldValues>() {
  return <const TItems extends FormItemConfig<TValues>[]>(items: TItems) =>
    items
}

export { FormItem, defineFormItems }
