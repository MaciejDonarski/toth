import type { Metadata } from "next"
import Link from "next/link"

import { getPendingEmail } from "@/auth/cookies"
import { maskEmail } from "@/core/auth/domain/email"
import { AuthHeading } from "@/ui/auth/auth-heading"
import { ResendVerification } from "@/ui/auth/resend-verification"

import { resendVerificationAction } from "../actions"

export const metadata: Metadata = { title: "Sprawdź skrzynkę" }

export default async function Page() {
  const pendingEmail = await getPendingEmail()

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title="Sprawdź skrzynkę"
        description={
          pendingEmail ? (
            <>
              Jeśli adres <strong>{maskEmail(pendingEmail)}</strong> nie ma
              jeszcze potwierdzonego konta, wysłaliśmy na niego link
              aktywacyjny. Link jest ważny 24 godziny.
            </>
          ) : (
            "Podaj adres email użyty przy rejestracji, a wyślemy nowy link aktywacyjny."
          )
        }
      />
      <ResendVerification
        onResend={resendVerificationAction}
        askForEmail={!pendingEmail}
        startInCooldown={!!pendingEmail}
      />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4">
          Wróć do logowania
        </Link>
      </p>
    </div>
  )
}
