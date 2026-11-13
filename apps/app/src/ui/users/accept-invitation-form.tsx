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
  roleLabel: string
  onAccept: (
    values: AcceptInvitationInput
  ) => Promise<
    (SubmitResult<AcceptInvitationInput> & { invalid?: boolean }) | void
  >
}

export function AcceptInvitationForm(props: AcceptInvitationFormProps) {
  const [invalid, setInvalid] = useState(false)
  if (invalid) return <InvalidInvitation />

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={`Dołącz do ${props.companyName}`}
        description={
          <>
            Zaproszenie dla <strong>{props.email}</strong> z rolą{" "}
            <strong>{props.roleLabel}</strong>. Ustaw swoje dane logowania.
          </>
        }
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
          label="Imię i nazwisko"
          autoComplete="name"
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
            { kind: "submit", label: "Załóż konto", className: "w-full" },
          ]}
        />
      </Form>
    </div>
  )
}

export function InvalidInvitation() {
  return (
    <div className="flex flex-col gap-4">
      <AuthHeading title="Zaproszenie" />
      <Alert variant="destructive">
        <AlertTitle>Zaproszenie jest nieważne</AlertTitle>
        <AlertDescription>
          Link wygasł, został już użyty albo zaproszenie odwołano. Poproś
          administratora firmy o nowe zaproszenie.
        </AlertDescription>
      </Alert>
      <p className="text-center text-sm">
        <Link href="/login" className="underline underline-offset-4">
          Przejdź do logowania
        </Link>
      </p>
    </div>
  )
}
