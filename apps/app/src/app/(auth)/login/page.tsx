import type { Metadata } from "next"
import { CircleCheckIcon } from "lucide-react"

import { Alert, AlertDescription } from "@toth/ui/components/alert"

import { LoginForm } from "@/ui/auth/login-form"

export const metadata: Metadata = { title: "Logowanie" }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>
}) {
  const { verified } = await searchParams

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
      <LoginForm />
    </div>
  )
}
