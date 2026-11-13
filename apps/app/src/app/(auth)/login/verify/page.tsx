import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getLoginChallengeCookie } from "@/auth/cookies"
import { safeRedirectPath } from "@/auth/safe-redirect"
import { getLoginChallenge } from "@/composition-root"
import type { LoginCodeInput } from "@/core/auth/application/schemas"
import { VerifyCodeForm } from "@/ui/auth/verify-code-form"

import { resendCodeAction, verifyCodeAction } from "./actions"

export const metadata: Metadata = { title: "Weryfikacja dwuetapowa" }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl } = await searchParams
  const target = safeRedirectPath(callbackUrl)

  const challenge = await getLoginChallenge(await getLoginChallengeCookie())
  if (!challenge) redirect("/login?expired=1")

  async function verify(input: LoginCodeInput) {
    "use server"
    return verifyCodeAction(input, target)
  }

  return (
    <VerifyCodeForm
      maskedEmail={challenge.maskedEmail}
      codeExpiresAt={challenge.codeExpiresAt.getTime()}
      nextResendAt={challenge.nextResendAt.getTime()}
      resendsLeft={challenge.resendsLeft}
      onVerify={verify}
      onResend={resendCodeAction}
    />
  )
}
