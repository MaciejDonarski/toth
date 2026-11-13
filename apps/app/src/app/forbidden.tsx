import { translatedMetadata } from "@/i18n/metadata"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ShieldAlertIcon } from "lucide-react"

import { Button } from "@toth/ui/components/button"

export const generateMetadata = translatedMetadata("forbidden")

/** Rendered (HTTP 403) when a page or action calls `forbidden()`. */
export default function Forbidden() {
  const t = useTranslations("forbidden")
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlertIcon
        aria-hidden="true"
        className="size-10 text-muted-foreground"
      />
      <h1 className="font-heading text-2xl font-bold">{t("title")}</h1>
      <p className="max-w-sm text-sm text-balance text-muted-foreground">
        {t("description")}
      </p>
      <Button nativeButton={false} render={<Link href="/dashboard" />}>
        {t("back")}
      </Button>
    </main>
  )
}
