import { translatedMetadata } from "@/i18n/metadata"

import { getTranslations } from "next-intl/server"

import { AuthHeading } from "@/ui/auth/auth-heading"
import {
  InvalidVerificationLink,
  VerifyEmailForm,
} from "@/ui/auth/verify-email-form"

import { verifyEmailAction } from "./actions"

export const generateMetadata = translatedMetadata("verifyEmail", {
  // Keep the token out of Referer headers sent to other origins.
  referrer: "no-referrer",
})

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token } = await searchParams
  const t = await getTranslations("auth.verifyEmail")

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title={t("title")} description={t("description")} />
      {typeof token === "string" && token ? (
        <VerifyEmailForm token={token} action={verifyEmailAction} />
      ) : (
        <InvalidVerificationLink />
      )}
    </div>
  )
}
