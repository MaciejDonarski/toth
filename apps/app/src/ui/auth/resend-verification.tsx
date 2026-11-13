"use client"

import { useState, useTransition } from "react"

import { Alert, AlertDescription } from "@toth/ui/components/alert"
import { Button } from "@toth/ui/components/button"
import { Field, FieldLabel } from "@toth/ui/components/field"
import { Input } from "@toth/ui/components/input"
import { Spinner } from "@toth/ui/components/spinner"

import { AUTH_POLICY } from "@/core/auth/domain/auth-policy"
import { formatCountdown, useCountdown } from "@/ui/hooks/use-countdown"

type ResendResult = { ok: true } | { ok: false; error: string }

export type ResendVerificationProps = {
  onResend: (email?: string) => Promise<ResendResult>
  /** Without a remembered address the user types it in. */
  askForEmail?: boolean
  /** Start in cooldown, e.g. right after registration sent the first link. */
  startInCooldown?: boolean
}

function cooldownEnd() {
  return new Date(Date.now() + AUTH_POLICY.emailVerificationResendCooldownMs)
}

export function ResendVerification({
  onResend,
  askForEmail = false,
  startInCooldown = false,
}: ResendVerificationProps) {
  const [availableAt, setAvailableAt] = useState<Date | null>(() =>
    startInCooldown ? cooldownEnd() : null
  )
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<ResendResult | null>(null)
  const [pending, startTransition] = useTransition()
  const remaining = useCountdown(availableAt)
  const coolingDown = remaining > 0

  function resend() {
    startTransition(async () => {
      const result = await onResend(askForEmail ? email : undefined)
      setMessage(result)
      if (result.ok) setAvailableAt(cooldownEnd())
    })
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        resend()
      }}
    >
      {askForEmail && (
        <Field>
          <FieldLabel htmlFor="resend-email">Email</FieldLabel>
          <Input
            id="resend-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
      )}
      <Button
        type="submit"
        variant="outline"
        disabled={pending || coolingDown}
        aria-busy={pending || undefined}
      >
        {pending && <Spinner data-icon="inline-start" />}
        {coolingDown
          ? `Wyślij ponownie za ${formatCountdown(remaining)}`
          : "Wyślij link ponownie"}
      </Button>
      <div aria-live="polite">
        {message && (
          <Alert variant={message.ok ? "default" : "destructive"}>
            <AlertDescription>
              {message.ok
                ? "Jeśli konto czeka na potwierdzenie, wysłaliśmy nowy link."
                : message.error}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </form>
  )
}
