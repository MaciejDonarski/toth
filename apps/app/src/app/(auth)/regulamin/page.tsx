import { translatedMetadata } from "@/i18n/metadata"

import { getTranslations } from "next-intl/server"

import { AUTH_POLICY } from "@/core/auth/domain/auth-policy"
import { AuthHeading } from "@/ui/auth/auth-heading"

export const generateMetadata = translatedMetadata("terms")

// TODO: replace with the real terms of service. Bump AUTH_POLICY.termsVersion
// whenever the content changes.
export default async function Page() {
  const t = await getTranslations("auth.terms")
  return (
    <div className="flex flex-col gap-4">
      <AuthHeading
        title={t("title")}
        description={t("version", { version: AUTH_POLICY.termsVersion })}
      />
      <p className="text-sm text-muted-foreground">{t("placeholder")}</p>
    </div>
  )
}
