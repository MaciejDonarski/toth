"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Form, FormActions, FormItem, type SubmitResult } from "@toth/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@toth/ui/components/card"
import { toast } from "@toth/ui/components/toast"

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
  // Remount after a successful change to clear the password fields.
  const [formKey, setFormKey] = useState(0)

  return (
    <div className="flex flex-col gap-4">
      <Form
        key={formKey}
        schema={changePasswordSchema}
        defaultValues={EMPTY}
        onSubmit={async (values) => {
          const result = await onChange(values)
          if (result?.changed) {
            toast.add({ type: "success", title: t("passwordChanged") })
            setFormKey((k) => k + 1)
          }
          return result
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("passwordHeading")}</CardTitle>
            <CardDescription>{t("passwordDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex max-w-sm flex-col gap-6">
            <FormItem
              type="password"
              name="newPassword"
              label={t("newPassword")}
              autoComplete="new-password"
              required
            />
            <PasswordChecklist name="newPassword" />
            <FormItem
              type="password"
              name="confirmPassword"
              label={t("confirmPassword")}
              autoComplete="new-password"
              required
            />
            <FormItem
              type="password"
              name="currentPassword"
              label={t("currentPassword")}
              autoComplete="current-password"
              required
            />
          </CardContent>
          <CardFooter>
            <FormActions
              actions={[{ kind: "submit", label: t("changePassword") }]}
            />
          </CardFooter>
        </Card>
      </Form>
    </div>
  )
}
