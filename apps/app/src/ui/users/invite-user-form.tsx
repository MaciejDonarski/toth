"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Form, FormActions, FormItem, type SubmitResult } from "@toth/form"
import { Alert, AlertDescription } from "@toth/ui/components/alert"
import { toast } from "@toth/ui/components/toast"

import { AUTH_POLICY } from "@/core/auth/domain/auth-policy"
import { ROLES } from "@/core/auth/domain/role"
import {
  inviteUserSchema,
  type InviteUserInput,
} from "@/core/users/application/schemas"

const INVITATION_HOURS = Math.round(AUTH_POLICY.invitationTtlMs / 3_600_000)

export type InviteUserFormProps = {
  onInvite: (
    values: InviteUserInput
  ) => Promise<(SubmitResult<InviteUserInput> & { sent?: boolean }) | void>
  /** No free seat: the form is shown disabled with an explanation. */
  limitReached: boolean
}

export function InviteUserForm({
  onInvite,
  limitReached,
}: InviteUserFormProps) {
  const t = useTranslations()
  const roleOptions = ROLES.map((role) => ({
    value: role,
    label: t(`roles.${role}`),
  }))
  // Remount the form after a successful invite to clear it.
  const [formKey, setFormKey] = useState(0)

  return (
    <div className="flex flex-col gap-4">
      {limitReached && (
        <Alert>
          <AlertDescription>{t("users.invite.limitReached")}</AlertDescription>
        </Alert>
      )}
      <Form
        key={formKey}
        schema={inviteUserSchema}
        defaultValues={{ email: "", role: "WORKER" }}
        className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-start"
        onSubmit={async (values) => {
          const result = await onInvite(values)
          if (result?.sent) {
            toast.add({
              type: "success",
              title: t("users.invite.sent", {
                email: values.email,
                hours: INVITATION_HOURS,
              }),
            })
            setFormKey((k) => k + 1)
          }
          return result
        }}
      >
        <FormItem
          type="email"
          name="email"
          label={t("common.email")}
          placeholder={t("common.emailPlaceholder")}
          autoComplete="off"
          disabled={limitReached}
        />
        <FormItem
          type="select"
          name="role"
          label={t("users.invite.role")}
          options={roleOptions}
          disabled={limitReached}
        />
        <FormActions
          className="sm:pt-6"
          actions={[
            {
              kind: "submit",
              label: t("users.invite.submit"),
              disabled: limitReached,
            },
          ]}
        />
      </Form>
    </div>
  )
}
