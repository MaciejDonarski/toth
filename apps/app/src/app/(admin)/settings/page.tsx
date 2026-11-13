import { translatedMetadata } from "@/i18n/metadata"

import { getTranslations } from "next-intl/server"

import { requirePermission } from "@/auth/dal"

export const generateMetadata = translatedMetadata("settings")

export default async function Page() {
  await requirePermission("settings.view")
  const t = await getTranslations("settings")

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
      <div className="min-h-64 flex-1 rounded-xl bg-muted/50" />
    </div>
  )
}
