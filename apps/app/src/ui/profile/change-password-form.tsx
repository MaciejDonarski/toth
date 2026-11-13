"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import {
  Form,
  FormActions,
  FormItem,
  FormSection,
  type SubmitResult,
} from "@toth/form"
import { Alert, AlertDescription } from "@toth/ui/components/alert"

import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/core/users/application/schemas"
import { PasswordChecklist } from "@/ui/auth/password-checklist"

const EMPTY: ChangePasswordInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}

export type ChangePasswordFormProps = {
  onChange: (
    values: ChangePasswordInput
  ) => Promise<
    (SubmitResult<ChangePasswordInput> & { changed?: boolean }) | void
  >
}

export function ChangePasswordForm({ onChange }: ChangePasswordFormProps) {
  const t = useTranslations("profile")
  const [changed, setChanged] = useState(false)
  // Remount after a successful change to clear the password fields.
  const [formKey, setFormKey] = useState(0)

  return (
    <div className="flex flex-col gap-4">
      <Form
        key={formKey}
        schema={changePasswordSchema}
        defaultValues={EMPTY}
        onSubmit={async (values) => {
          setChanged(false)
          const result = await onChange(values)
          if (result?.changed) {
            setChanged(true)
            setFormKey((k) => k + 1)
          }
          return result
        }}
      >
        <FormSection
          title={t("passwordHeading")}
          description={t("passwordDescription")}
        >
          <FormItem
            type="password"
            name="currentPassword"
            label={t("currentPassword")}
            autoComplete="current-password"
            required
            colSpan={{ base: 12, md: 6 }}
          />
          <div className="col-span-12" />
          <FormItem
            type="password"
            name="newPassword"
            label={t("newPassword")}
            autoComplete="new-password"
            required
            colSpan={{ base: 12, md: 6 }}
          />
          <FormItem
            type="password"
            name="confirmPassword"
            label={t("confirmPassword")}
            autoComplete="new-password"
            required
            colSpan={{ base: 12, md: 6 }}
          />
          <div className="col-span-12 pt-3">
            <PasswordChecklist name="newPassword" />
          </div>
        </FormSection>
        <FormActions
          actions={[{ kind: "submit", label: t("changePassword") }]}
        />
      </Form>
      <div aria-live="polite">
        {changed && (
          <Alert>
            <AlertDescription>{t("passwordChanged")}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
