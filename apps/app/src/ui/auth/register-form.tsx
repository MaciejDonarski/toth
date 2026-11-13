"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"

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
  const t = useTranslations()
  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={t("auth.register.title")}
        description={t("auth.register.description")}
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
          label={t("auth.register.companyName")}
          autoComplete="organization"
          required
        />
        <FormItem
          type="email"
          name="email"
          label={t("common.email")}
          autoComplete="email"
          placeholder={t("common.emailPlaceholder")}
          required
        />
        <FormItem
          type="password"
          name="password"
          label={t("common.password")}
          autoComplete="new-password"
          required
        />
        <PasswordChecklist />
        <FormItem
          type="password"
          name="confirmPassword"
          label={t("common.confirmPassword")}
          autoComplete="new-password"
          required
        />
        <FormItem
          type="checkbox"
          name="acceptTerms"
          label={t("common.acceptTerms")}
          description={
            <Link
              href="/regulamin"
              target="_blank"
              className="underline underline-offset-4"
            >
              {t("common.readTerms")}
            </Link>
          }
          required
        />
        <FormActions
          actions={[
            {
              kind: "submit",
              label: t("auth.register.submit"),
              className: "w-full",
            },
          ]}
        />
      </Form>
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.register.haveAccount")}{" "}
        <Link href="/login" className="underline underline-offset-4">
          {t("auth.register.login")}
        </Link>
      </p>
    </div>
  )
}
