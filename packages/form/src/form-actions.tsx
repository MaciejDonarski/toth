"use client"

import type { ComponentProps, ReactNode } from "react"
import { useFormContext, useFormState } from "react-hook-form"
import { CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription } from "@toth/ui/components/alert"
import { Button } from "@toth/ui/components/button"
import { Spinner } from "@toth/ui/components/spinner"
import { cn } from "@toth/ui/lib/utils"

import { useFormConfig, useFormLocale } from "./form-context"
import type { FormAction, LinkComponent } from "./types"

function DefaultLink({
  href,
  children,
  ...props
}: { href: string; children?: ReactNode } & Record<string, unknown>) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  )
}

/** Form-level error returned from `onSubmit`. Renders nothing when empty. */
function FormError({ className, ...props }: ComponentProps<"div">) {
  const { formError } = useFormConfig()
  const { translateError } = useFormLocale()
  if (!formError) return null

  return (
    <Alert
      variant="destructive"
      data-slot="form-error"
      className={className}
      {...props}
    >
      <CircleAlertIcon />
      <AlertDescription>{translateError(formError)}</AlertDescription>
    </Alert>
  )
}

function SubmitButton({ action }: { action: FormAction }) {
  const { isSubmitting } = useFormState()

  return (
    <Button
      type="submit"
      variant={action.variant}
      size={action.size}
      className={action.className}
      disabled={action.disabled || isSubmitting}
      aria-busy={isSubmitting || undefined}
    >
      {isSubmitting ? <Spinner data-icon="inline-start" /> : action.icon}
      {action.label}
    </Button>
  )
}

function ResetButton({ action }: { action: FormAction }) {
  const { reset } = useFormContext()
  const { setFormError } = useFormConfig()

  return (
    <Button
      type="button"
      variant={action.variant ?? "outline"}
      size={action.size}
      className={action.className}
      disabled={action.disabled}
      onClick={() => {
        reset()
        setFormError?.(undefined)
      }}
    >
      {action.icon}
      {action.label}
    </Button>
  )
}

function ActionButton({
  action,
  linkComponent,
}: {
  action: FormAction
  linkComponent: LinkComponent
}) {
  switch (action.kind) {
    case "submit":
      return <SubmitButton action={action} />
    case "reset":
      return <ResetButton action={action} />
    case "button":
      return (
        <Button
          type="button"
          variant={action.variant ?? "outline"}
          size={action.size}
          className={action.className}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.icon}
          {action.label}
        </Button>
      )
    case "link": {
      const Link = linkComponent
      return (
        <Button
          variant={action.variant ?? "ghost"}
          size={action.size}
          className={action.className}
          disabled={action.disabled}
          nativeButton={false}
          render={<Link href={action.href} />}
        >
          {action.icon}
          {action.label}
        </Button>
      )
    }
  }
}

const ALIGN = {
  start: "justify-start",
  end: "justify-end",
  between: "justify-between",
} as const

export interface FormActionsProps extends ComponentProps<"div"> {
  /** Buttons/links to render. Ignored when `children` is given. */
  actions?: FormAction[]
  align?: keyof typeof ALIGN
  /** Show the `onSubmit` form-level error above the bar. Defaults to `true`. */
  showFormError?: boolean
}

/**
 * Bar with form buttons. Pass `actions` to render them from config, or
 * `children` to use it as a plain layout wrapper.
 */
function FormActions({
  actions,
  align = "end",
  showFormError = true,
  className,
  children,
  ...props
}: FormActionsProps) {
  const { linkComponent = DefaultLink } = useFormConfig()

  return (
    <div data-slot="form-actions" className="flex flex-col gap-4">
      {showFormError && <FormError />}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          ALIGN[align],
          className
        )}
        {...props}
      >
        {children ??
          actions?.map((action) => (
            <ActionButton
              key={`${action.kind}:${action.kind === "link" ? action.href : String(action.label)}`}
              action={action}
              linkComponent={linkComponent}
            />
          ))}
      </div>
    </div>
  )
}

export { FormActions, FormError }
