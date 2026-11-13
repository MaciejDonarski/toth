"use client"

import { useState } from "react"
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
  const [invalid, setInvalid] = useState(false)
  if (invalid) return <InvalidResetLink />

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title="Ustaw nowe hasło"
        description="Po zmianie hasła zostaniesz wylogowany ze wszystkich urządzeń."
      />
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
          label="Nowe hasło"
          autoComplete="new-password"
          required
        />
        <PasswordChecklist />
        <FormItem
          type="password"
          name="confirmPassword"
          label="Powtórz nowe hasło"
          autoComplete="new-password"
          required
        />
        <FormActions
          actions={[
            { kind: "submit", label: "Zmień hasło", className: "w-full" },
          ]}
        />
      </Form>
    </div>
  )
}

export function InvalidResetLink() {
  return (
    <div className="flex flex-col gap-4">
      <AuthHeading title="Ustaw nowe hasło" />
      <Alert variant="destructive">
        <AlertTitle>Link jest nieprawidłowy lub wygasł</AlertTitle>
        <AlertDescription>
          Link do zmiany hasła działa tylko raz i przez ograniczony czas. Poproś
          o nowy.
        </AlertDescription>
      </Alert>
      <Button nativeButton={false} render={<Link href="/forgot-password" />}>
        Wyślij nowy link
      </Button>
    </div>
  )
}
