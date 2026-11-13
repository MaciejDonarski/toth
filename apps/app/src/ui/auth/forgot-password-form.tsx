"use client"

import { useState } from "react"
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
  const [sent, setSent] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title="Nie pamiętasz hasła?"
        description="Podaj adres email konta, a wyślemy link do ustawienia nowego hasła."
      />
      {sent ? (
        <Alert>
          <MailCheckIcon />
          <AlertTitle>Sprawdź skrzynkę</AlertTitle>
          <AlertDescription>
            Jeśli konto z tym adresem istnieje, wysłaliśmy na nie link do zmiany
            hasła. Link jest ważny {RESET_MINUTES} minut i działa tylko raz.
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
            label="Email"
            autoComplete="email"
            placeholder="jan@firma.pl"
          />
          <FormActions
            actions={[
              { kind: "submit", label: "Wyślij link", className: "w-full" },
            ]}
          />
        </Form>
      )}
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4">
          Wróć do logowania
        </Link>
      </p>
    </div>
  )
}
