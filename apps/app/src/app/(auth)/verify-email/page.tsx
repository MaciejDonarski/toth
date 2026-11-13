import type { Metadata } from "next"

import { AuthHeading } from "@/ui/auth/auth-heading"
import {
  InvalidVerificationLink,
  VerifyEmailForm,
} from "@/ui/auth/verify-email-form"

import { verifyEmailAction } from "./actions"

export const metadata: Metadata = {
  title: "Potwierdź email",
  // Keep the token out of Referer headers sent to other origins.
  referrer: "no-referrer",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token } = await searchParams

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title="Potwierdź adres email"
        description="Kliknij przycisk poniżej, aby aktywować konto."
      />
      {typeof token === "string" && token ? (
        <VerifyEmailForm token={token} action={verifyEmailAction} />
      ) : (
        <InvalidVerificationLink />
      )}
    </div>
  )
}
