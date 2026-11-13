"use client"

import { useActionState } from "react"
import Link from "next/link"

import { Alert, AlertDescription, AlertTitle } from "@toth/ui/components/alert"
import { Button } from "@toth/ui/components/button"
import { Spinner } from "@toth/ui/components/spinner"

type VerifyState = { status: "idle" | "invalid" }

export type VerifyEmailFormProps = {
  token: string
  action: (state: VerifyState, formData: FormData) => Promise<VerifyState>
}

export function VerifyEmailForm({ token, action }: VerifyEmailFormProps) {
  const [state, formAction, pending] = useActionState<VerifyState, FormData>(
    action,
    {
      status: "idle",
    }
  )

  if (state.status === "invalid") return <InvalidVerificationLink />

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending && <Spinner data-icon="inline-start" />}
        Potwierdź adres email
      </Button>
    </form>
  )
}

export function InvalidVerificationLink() {
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertTitle>Link jest nieprawidłowy lub wygasł</AlertTitle>
        <AlertDescription>
          Link mógł zostać już użyty albo minęła jego ważność. Wyślij nowy link,
          aby potwierdzić adres.
        </AlertDescription>
      </Alert>
      <Button
        nativeButton={false}
        render={<Link href="/register/check-email" />}
      >
        Wyślij nowy link
      </Button>
    </div>
  )
}
