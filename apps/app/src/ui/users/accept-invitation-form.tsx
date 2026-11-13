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

import type { Role } from "@/core/auth/domain/role"
import {
  acceptInvitationSchema,
  type AcceptInvitationInput,
} from "@/core/users/application/schemas"
import { AuthHeading } from "@/ui/auth/auth-heading"
import { PasswordChecklist } from "@/ui/auth/password-checklist"

const DEFAULT_VALUES: AcceptInvitationInput = {
  name: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
}

export type AcceptInvitationFormProps = {
  companyName: string
  email: string
  role: Role
  onAccept: (
    values: AcceptInvitationInput
  ) => Promise<
    (SubmitResult<AcceptInvitationInput> & { invalid?: boolean }) | void
  >
}

export function AcceptInvitationForm(props: AcceptInvitationFormProps) {
  const t = useTranslations()
  const [invalid, setInvalid] = useState(false)
  if (invalid) return <InvalidInvitation />

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={t("acceptInvite.title", { company: props.companyName })}
        description={t.rich("acceptInvite.description", {
          email: props.email,
          role: t(`roles.${props.role}`),
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      />
      <Form
        schema={acceptInvitationSchema}
        defaultValues={DEFAULT_VALUES}
        linkComponent={Link as LinkComponent}
        onSubmit={async (values) => {
          const result = await props.onAccept(values)
          if (result?.invalid) setInvalid(true)
          return result
        }}
      >
        <FormItem
          type="text"
          name="name"
          label={t("common.name")}
          autoComplete="name"
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
              label: t("acceptInvite.submit"),
              className: "w-full",
            },
          ]}
        />
      </Form>
    </div>
  )
}

export function InvalidInvitation() {
  const t = useTranslations()
  return (
    <div className="flex flex-col gap-4">
      <AuthHeading title={t("acceptInvite.invalidHeading")} />
      <Alert variant="destructive">
        <AlertTitle>{t("acceptInvite.invalidTitle")}</AlertTitle>
        <AlertDescription>
          {t("acceptInvite.invalidDescription")}
        </AlertDescription>
      </Alert>
      <p className="text-center text-sm">
        <Link href="/login" className="underline underline-offset-4">
          {t("common.goToLogin")}
        </Link>
      </p>
    </div>
  )
}
