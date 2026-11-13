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

import { loginSchema, type LoginInput } from "@/core/auth/application/schemas"

import { AuthHeading } from "./auth-heading"

const DEFAULT_VALUES: LoginInput = { email: "", password: "" }

export type LoginResult = SubmitResult<LoginInput> & { unverified?: boolean }

export type LoginFormProps = {
  onLogin: (values: LoginInput) => Promise<LoginResult | void>
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [unverified, setUnverified] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title="Zaloguj się"
        description="Podaj email i hasło, aby zalogować się do panelu"
      />
      <Form
        schema={loginSchema}
        defaultValues={DEFAULT_VALUES}
        linkComponent={Link as LinkComponent}
        onSubmit={async (values) => {
          const result = await onLogin(values)
          setUnverified(!!result?.unverified)
          return result
        }}
      >
        <FormItem
          type="email"
          name="email"
          label="Email"
          autoComplete="username"
          placeholder="jan@firma.pl"
        />
        <FormItem
          type="password"
          name="password"
          label="Hasło"
          autoComplete="current-password"
          description={
            <Link
              href="/forgot-password"
              className="underline-offset-4 hover:underline"
            >
              Nie pamiętasz hasła?
            </Link>
          }
        />
        <FormActions
          actions={[{ kind: "submit", label: "Zaloguj", className: "w-full" }]}
        />
      </Form>
      {unverified && (
        <p className="text-center text-sm">
          <Link
            href="/register/check-email"
            className="underline underline-offset-4"
          >
            Wyślij link aktywacyjny ponownie
          </Link>
        </p>
      )}
      <p className="text-center text-sm text-muted-foreground">
        Nie masz konta?{" "}
        <Link href="/register" className="underline underline-offset-4">
          Zarejestruj firmę
        </Link>
      </p>
    </div>
  )
}
