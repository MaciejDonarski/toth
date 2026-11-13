"use client"

import { useState } from "react"

import { Form, FormActions, FormItem, type SubmitResult } from "@toth/form"
import { Alert, AlertDescription } from "@toth/ui/components/alert"

import { ROLES } from "@/core/auth/domain/role"
import {
  inviteUserSchema,
  type InviteUserInput,
} from "@/core/users/application/schemas"
import { ROLE_LABELS } from "@/core/users/domain/membership"

const ROLE_OPTIONS = ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}))

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
  const [sentTo, setSentTo] = useState<string | null>(null)
  // Remount the form after a successful invite to clear it.
  const [formKey, setFormKey] = useState(0)

  return (
    <div className="flex flex-col gap-4">
      {limitReached && (
        <Alert>
          <AlertDescription>
            Wykorzystano wszystkie miejsca w firmie. Odwołaj zaproszenie lub
            wyłącz nieaktywnego użytkownika, aby zaprosić kolejną osobę.
          </AlertDescription>
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
            setSentTo(values.email)
            setFormKey((k) => k + 1)
          }
          return result
        }}
      >
        <FormItem
          type="email"
          name="email"
          label="Email"
          placeholder="jan@firma.pl"
          autoComplete="off"
          disabled={limitReached}
        />
        <FormItem
          type="select"
          name="role"
          label="Rola"
          options={ROLE_OPTIONS}
          disabled={limitReached}
        />
        <FormActions
          className="sm:pt-6"
          actions={[
            { kind: "submit", label: "Zaproś", disabled: limitReached },
          ]}
        />
      </Form>
      <div aria-live="polite">
        {sentTo && (
          <Alert>
            <AlertDescription>
              Wysłano zaproszenie na adres {sentTo}. Jest ważne 72 godziny.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
