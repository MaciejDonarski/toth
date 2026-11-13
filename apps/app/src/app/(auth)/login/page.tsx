import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

import { Alert, AlertDescription } from "@toth/ui/components/alert"

import { getCurrentUser } from "@/auth/dal"
import { safeRedirectPath } from "@/auth/safe-redirect"
import { LoginForm } from "@/ui/auth/login-form"

import { loginAction } from "./actions"

export const metadata: Metadata = { title: "Logowanie" }

type SearchParams = Promise<{
  verified?: string
  expired?: string
  callbackUrl?: string
}>

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { verified, expired, callbackUrl } = await searchParams
  const target = safeRedirectPath(callbackUrl)

  // Validated against the DB, so a stale cookie cannot cause a redirect loop.
  if (await getCurrentUser()) redirect(target)

  async function login(values: Parameters<typeof loginAction>[0]) {
    "use server"
    return loginAction(values, target)
  }

  return (
    <div className="flex flex-col gap-6">
      {verified === "1" && (
        <Alert>
          <CircleCheckIcon />
          <AlertDescription>
            Adres email potwierdzony. Możesz się zalogować.
          </AlertDescription>
        </Alert>
      )}
      {expired === "1" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            Weryfikacja wygasła. Zaloguj się ponownie.
          </AlertDescription>
        </Alert>
      )}
      <LoginForm onLogin={login} />
    </div>
  )
}
