import { translatedMetadata } from "@/i18n/metadata"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { getPendingEmail } from "@/auth/cookies"
import { maskEmail } from "@/core/auth/domain/email"
import { AuthHeading } from "@/ui/auth/auth-heading"
import { ResendVerification } from "@/ui/auth/resend-verification"

import { resendVerificationAction } from "../actions"

export const generateMetadata = translatedMetadata("checkEmail")

export default async function Page() {
  const pendingEmail = await getPendingEmail()
  const t = await getTranslations()

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={t("auth.checkEmail.title")}
        description={
          pendingEmail
            ? t.rich("auth.checkEmail.sent", {
                email: maskEmail(pendingEmail),
                strong: (chunks) => <strong>{chunks}</strong>,
              })
            : t("auth.checkEmail.askEmail")
        }
      />
      <ResendVerification
        onResend={resendVerificationAction}
        askForEmail={!pendingEmail}
        startInCooldown={!!pendingEmail}
      />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4">
          {t("common.backToLogin")}
        </Link>
      </p>
    </div>
  )
}
