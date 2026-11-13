"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { MailCheckIcon } from "lucide-react"

import {
  Form,
  FormActions,
  FormItem,
  type LinkComponent,
  type SubmitResult,
} from "@toth/form"
import { Alert, AlertDescription, AlertTitle } from "@toth/ui/components/alert"

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
  const [sent, setSent] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={t("auth.forgot.title")}
        description={t("auth.forgot.description")}
      />
      {sent ? (
        <Alert>
          <MailCheckIcon />
          <AlertTitle>{t("auth.forgot.sentTitle")}</AlertTitle>
          <AlertDescription>
            {t("auth.forgot.sentDescription", { minutes: RESET_MINUTES })}
          </AlertDescription>
        </Alert>
      ) : (
        <Form
          schema={forgotPasswordSchema}
          defaultValues={{ email: "" }}
          linkComponent={Link as LinkComponent}
          onSubmit={async (values) => {
            const result = await onRequest(values)
            if (result?.sent) setSent(true)
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
      )}
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4">
          {t("common.backToLogin")}
        </Link>
      </p>
    </div>
  )
}
