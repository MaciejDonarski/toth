import { translatedMetadata } from "@/i18n/metadata"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription } from "@toth/ui/components/alert"

import { getCurrentUser } from "@/auth/dal"
import { safeRedirectPath } from "@/auth/safe-redirect"
import { LoginForm } from "@/ui/auth/login-form"
import { LoginNotices } from "@/ui/auth/login-notices"

import { loginAction } from "./actions"

export const generateMetadata = translatedMetadata("login")

type SearchParams = Promise<{
  verified?: string
  expired?: string
  reset?: string
  invited?: string
  callbackUrl?: string
}>

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { verified, expired, reset, invited, callbackUrl } = await searchParams
  const target = safeRedirectPath(callbackUrl)

  // Validated against the DB, so a stale cookie cannot cause a redirect loop.
  if (await getCurrentUser()) redirect(target)

  const t = await getTranslations("auth.login")
  // Status messages after redirects to /login (?verified=1, ?reset=1, …):
  // successes become toasts, the expired-session error stays an alert.
  const successes = [
    verified === "1" && t("verified"),
    invited === "1" && t("invited"),
    reset === "1" && t("reset"),
  ].filter((text): text is string => !!text)

  async function login(values: Parameters<typeof loginAction>[0]) {
    "use server"
    return loginAction(values, target)
  }

  return (
    <div className="flex flex-col gap-6">
      <LoginNotices messages={successes} />
      {expired === "1" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{t("expired")}</AlertDescription>
        </Alert>
      )}
      <LoginForm onLogin={login} />
    </div>
  )
}
