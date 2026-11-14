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
import { toast } from "@toth/ui/components/toast"

import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/core/auth/application/schemas"
import { AUTH_POLICY } from "@/core/auth/domain/auth-policy"

import { AuthHeading } from "./auth-heading"

const RESET_MINUTES = Math.round(AUTH_POLICY.passwordResetTtlMs / 60_000)

export type ForgotPasswordFormProps = {
  onRequest: (
    values: ForgotPasswordInput
  ) => Promise<(SubmitResult<ForgotPasswordInput> & { sent?: boolean }) | void>
}

export function ForgotPasswordForm({ onRequest }: ForgotPasswordFormProps) {
  const t = useTranslations()
  // Remount after a request to clear the email field.
  const [formKey, setFormKey] = useState(0)

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={t("auth.forgot.title")}
        description={t("auth.forgot.description")}
      />
      <Form
        key={formKey}
        schema={forgotPasswordSchema}
        defaultValues={{ email: "" }}
        linkComponent={Link as LinkComponent}
        onSubmit={async (values) => {
          const result = await onRequest(values)
          if (result?.sent) {
            toast.add({
              type: "success",
              title: t("auth.forgot.sentTitle"),
              description: t("auth.forgot.sentDescription", {
                minutes: RESET_MINUTES,
              }),
            })
            setFormKey((k) => k + 1)
          }
          return result
        }}
      >
        <FormItem
          type="email"
          name="email"
          label={t("common.email")}
          autoComplete="email"
          placeholder={t("common.emailPlaceholder")}
        />
        <FormActions
          actions={[
            {
              kind: "submit",
              label: t("auth.forgot.submit"),
              className: "w-full",
            },
          ]}
        />
      </Form>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4">
          {t("common.backToLogin")}
        </Link>
      </p>
    </div>
  )
}
