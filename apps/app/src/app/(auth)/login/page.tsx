import { translatedMetadata } from "@/i18n/metadata"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

import { Alert, AlertDescription } from "@toth/ui/components/alert"

import { getCurrentUser } from "@/auth/dal"
import { safeRedirectPath } from "@/auth/safe-redirect"
import { LoginForm } from "@/ui/auth/login-form"

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
  // Status banners after redirects to /login (?verified=1, ?reset=1, …).
  const notices = [
    { show: verified === "1", text: t("verified"), error: false },
    { show: invited === "1", text: t("invited"), error: false },
    { show: reset === "1", text: t("reset"), error: false },
    { show: expired === "1", text: t("expired"), error: true },
  ].filter((notice) => notice.show)

  async function login(values: Parameters<typeof loginAction>[0]) {
    "use server"
    return loginAction(values, target)
  }

  return (
    <div className="flex flex-col gap-6">
      {notices.map((notice) => (
        <Alert
          key={notice.text}
          variant={notice.error ? "destructive" : "default"}
        >
          {notice.error ? <CircleAlertIcon /> : <CircleCheckIcon />}
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ))}
      <LoginForm onLogin={login} />
    </div>
  )
}
