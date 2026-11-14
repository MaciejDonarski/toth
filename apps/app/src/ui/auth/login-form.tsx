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

import { loginSchema, type LoginInput } from "@/core/auth/application/schemas"

import { AuthHeading } from "./auth-heading"

const DEFAULT_VALUES: LoginInput = { email: "", password: "" }

export type LoginResult = SubmitResult<LoginInput> & { unverified?: boolean }

export type LoginFormProps = {
  onLogin: (values: LoginInput) => Promise<LoginResult | void>
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const t = useTranslations()
  const [unverified, setUnverified] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={t("auth.login.title")}
        description={t("auth.login.description")}
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
          label={t("common.email")}
          autoComplete="username"
          placeholder={t("common.emailPlaceholder")}
        />
        <FormItem
          type="password"
          name="password"
          label={t("common.password")}
          autoComplete="current-password"
          description={
            <Link
              href="/forgot-password"
              className="underline-offset-4 hover:underline"
            >
              {t("auth.login.forgotPassword")}
            </Link>
          }
        />
        <FormActions
          actions={[
            {
              kind: "submit",
              label: t("auth.login.submit"),
              className: "w-full",
            },
          ]}
        />
      </Form>
      {unverified && (
        <p className="text-center text-sm">
          <Link
            href="/register/check-email"
            className="underline underline-offset-4"
          >
            {t("auth.login.resendActivation")}
          </Link>
        </p>
      )}
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="underline underline-offset-4">
          {t("auth.login.register")}
        </Link>
      </p>
    </div>
  )
}
