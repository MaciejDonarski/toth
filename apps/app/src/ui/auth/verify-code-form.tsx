"use client"

import { useId, useState, useTransition } from "react"
import Link from "next/link"
import { CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription } from "@toth/ui/components/alert"
import { Button } from "@toth/ui/components/button"
import { Checkbox } from "@toth/ui/components/checkbox"
import { Field, FieldLabel } from "@toth/ui/components/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@toth/ui/components/input-otp"
import { Spinner } from "@toth/ui/components/spinner"

import { AUTH_POLICY } from "@/core/auth/domain/auth-policy"
import { formatCountdown, useCountdown } from "@/ui/hooks/use-countdown"

import { AuthHeading } from "./auth-heading"

const CODE_LENGTH = AUTH_POLICY.loginCodeLength
const TRUST_DAYS = Math.round(AUTH_POLICY.trustedDeviceTtlMs / 86_400_000)

type VerifyResult = { error: string; restart?: boolean; expired?: boolean }
type ResendResult =
  | {
      ok: true
      codeExpiresAt: number
      nextResendAt: number
      resendsLeft: number
    }
  | { ok: false; error: string; restart?: boolean; retryAt?: number }

export type VerifyCodeFormProps = {
  maskedEmail: string
  /** Epoch ms; numbers cross the server/client boundary safely. */
  codeExpiresAt: number
  nextResendAt: number
  resendsLeft: number
  onVerify: (input: {
    code: string
    remember: boolean
  }) => Promise<VerifyResult | void>
  onResend: () => Promise<ResendResult>
}

export function VerifyCodeForm(props: VerifyCodeFormProps) {
  const { maskedEmail, onVerify, onResend } = props
  const rememberId = useId()
  const [code, setCode] = useState("")
  const [remember, setRemember] = useState(false)
  const [expiresAt, setExpiresAt] = useState(
    () => new Date(props.codeExpiresAt)
  )
  const [resendAt, setResendAt] = useState(() => new Date(props.nextResendAt))
  const [resendsLeft, setResendsLeft] = useState(props.resendsLeft)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [restart, setRestart] = useState(false)
  const [verifying, startVerify] = useTransition()
  const [resending, startResend] = useTransition()

  const codeLeft = useCountdown(expiresAt)
  const resendLeft = useCountdown(resendAt)
  const expired = codeLeft === 0

  function verify(value: string) {
    if (value.length !== CODE_LENGTH || expired || restart) return
    setNotice(null)
    startVerify(async () => {
      const result = await onVerify({ code: value, remember })
      if (!result) return
      setError(result.error)
      setRestart(!!result.restart)
      setCode("")
    })
  }

  function resend() {
    setError(null)
    setNotice(null)
    startResend(async () => {
      const result = await onResend()
      if (result.ok) {
        setExpiresAt(new Date(result.codeExpiresAt))
        setResendAt(new Date(result.nextResendAt))
        setResendsLeft(result.resendsLeft)
        setCode("")
        setNotice("Wysłaliśmy nowy kod. Poprzedni przestał działać.")
        return
      }
      setError(result.error)
      setRestart(!!result.restart)
      if (result.retryAt) setResendAt(new Date(result.retryAt))
    })
  }

  if (restart) {
    return (
      <div className="flex flex-col gap-6">
        <AuthHeading title="Weryfikacja dwuetapowa" />
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button nativeButton={false} render={<Link href="/login" />}>
          Wróć do logowania
        </Button>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        verify(code)
      }}
    >
      <AuthHeading
        title="Weryfikacja dwuetapowa"
        description={
          <>
            Wpisz {CODE_LENGTH}-cyfrowy kod wysłany na adres{" "}
            <strong>{maskedEmail}</strong>.
          </>
        }
      />

      <div className="flex flex-col items-center gap-3">
        <InputOTP
          maxLength={CODE_LENGTH}
          pattern="^\d+$"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="Kod weryfikacyjny"
          value={code}
          onChange={setCode}
          onComplete={verify}
          disabled={expired || verifying}
        >
          <InputOTPGroup>
            {Array.from({ length: CODE_LENGTH }, (_, index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <p
          className="text-sm text-muted-foreground"
          aria-live={expired ? "assertive" : "off"}
          data-testid="code-timer"
        >
          {expired ? (
            <span className="text-destructive">
              Kod wygasł. Wyślij nowy kod.
            </span>
          ) : (
            <>Kod jest ważny jeszcze {formatCountdown(codeLeft)}</>
          )}
        </p>
      </div>

      <Field orientation="horizontal">
        <Checkbox
          id={rememberId}
          checked={remember}
          onCheckedChange={(checked) => setRemember(checked === true)}
        />
        <FieldLabel htmlFor={rememberId} className="font-normal">
          Zapamiętaj tę przeglądarkę na {TRUST_DAYS} dni
        </FieldLabel>
      </Field>

      <div aria-live="polite" className="empty:hidden">
        {error && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {notice && (
          <Alert>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          disabled={code.length !== CODE_LENGTH || expired || verifying}
          aria-busy={verifying || undefined}
        >
          {verifying && <Spinner data-icon="inline-start" />}
          Zweryfikuj
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={resend}
          disabled={resending || resendLeft > 0 || resendsLeft <= 0}
          aria-busy={resending || undefined}
        >
          {resending && <Spinner data-icon="inline-start" />}
          {resendsLeft <= 0
            ? "Limit ponownych wysyłek wykorzystany"
            : resendLeft > 0
              ? `Wyślij kod ponownie za ${formatCountdown(resendLeft)}`
              : "Wyślij kod ponownie"}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4">
          Zaloguj się na inne konto
        </Link>
      </p>
    </form>
  )
}
