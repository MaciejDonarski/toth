"use client"

import Link from "next/link"

import {
  Form,
  FormActions,
  FormItem,
  type LinkComponent,
  type SubmitResult,
} from "@toth/form"

import {
  registerSchema,
  type RegisterInput,
} from "@/core/auth/application/schemas"

import { AuthHeading } from "./auth-heading"
import { PasswordChecklist } from "./password-checklist"

const DEFAULT_VALUES: RegisterInput = {
  companyName: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
}

export type RegisterFormProps = {
  onRegister: (
    values: RegisterInput
  ) => Promise<SubmitResult<RegisterInput> | void>
}

export function RegisterForm({ onRegister }: RegisterFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title="Załóż konto firmy"
        description="Zarejestruj firmę i zostań jej administratorem."
      />
      <Form
        schema={registerSchema}
        defaultValues={DEFAULT_VALUES}
        onSubmit={onRegister}
        linkComponent={Link as LinkComponent}
      >
        <FormItem
          type="text"
          name="companyName"
          label="Nazwa firmy"
          autoComplete="organization"
          required
        />
        <FormItem
          type="email"
          name="email"
          label="Email"
          autoComplete="email"
          placeholder="jan@firma.pl"
          required
        />
        <FormItem
          type="password"
          name="password"
          label="Hasło"
          autoComplete="new-password"
          required
        />
        <PasswordChecklist />
        <FormItem
          type="password"
          name="confirmPassword"
          label="Powtórz hasło"
          autoComplete="new-password"
          required
        />
        <FormItem
          type="checkbox"
          name="acceptTerms"
          label="Akceptuję regulamin"
          description={
            <Link
              href="/regulamin"
              target="_blank"
              className="underline underline-offset-4"
            >
              Przeczytaj regulamin
            </Link>
          }
          required
        />
        <FormActions
          actions={[
            { kind: "submit", label: "Zarejestruj", className: "w-full" },
          ]}
        />
      </Form>
      <p className="text-center text-sm text-muted-foreground">
        Masz już konto?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Zaloguj się
        </Link>
      </p>
    </div>
  )
}
