"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"

import {
  Form,
  FormActions,
  FormItem,
  type LinkComponent,
  type SubmitResult,
} from "@toth/form"
import { Alert, AlertDescription, AlertTitle } from "@toth/ui/components/alert"
import { Button } from "@toth/ui/components/button"

import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/core/auth/application/schemas"

import { AuthHeading } from "./auth-heading"
import { PasswordChecklist } from "./password-checklist"

export type ResetPasswordFormProps = {
  onReset: (
    values: ResetPasswordInput
  ) => Promise<
    (SubmitResult<ResetPasswordInput> & { invalidToken?: boolean }) | void
  >
}

export function ResetPasswordForm({ onReset }: ResetPasswordFormProps) {
  const t = useTranslations("auth.reset")
  const [invalid, setInvalid] = useState(false)
  if (invalid) return <InvalidResetLink />

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title={t("title")} description={t("description")} />
      <Form
        schema={resetPasswordSchema}
        defaultValues={{ password: "", confirmPassword: "" }}
        linkComponent={Link as LinkComponent}
        onSubmit={async (values) => {
          const result = await onReset(values)
          if (result?.invalidToken) setInvalid(true)
          return result
        }}
      >
        <FormItem
          type="password"
          name="password"
          label={t("newPassword")}
          autoComplete="new-password"
          required
        />
        <PasswordChecklist />
        <FormItem
          type="password"
          name="confirmPassword"
          label={t("confirmPassword")}
          autoComplete="new-password"
          required
        />
        <FormActions
          actions={[
            { kind: "submit", label: t("submit"), className: "w-full" },
          ]}
        />
      </Form>
    </div>
  )
}

export function InvalidResetLink() {
  const t = useTranslations("auth.reset")
  return (
    <div className="flex flex-col gap-4">
      <AuthHeading title={t("title")} />
      <Alert variant="destructive">
        <AlertTitle>{t("invalidTitle")}</AlertTitle>
        <AlertDescription>{t("invalidDescription")}</AlertDescription>
      </Alert>
      <Button nativeButton={false} render={<Link href="/forgot-password" />}>
        {t("sendNew")}
      </Button>
    </div>
  )
}
