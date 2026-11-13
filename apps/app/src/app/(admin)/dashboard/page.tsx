import { translatedMetadata } from "@/i18n/metadata"

import { Badge } from "@toth/ui/components/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@toth/ui/components/card"

import { getTranslations } from "next-intl/server"

import { requirePermission } from "@/auth/dal"
import { getGreeting } from "@/composition-root"

export const generateMetadata = translatedMetadata("dashboard")

export default async function Page() {
  const user = await requirePermission("dashboard.view")
  const greeting = await getGreeting(user.name ?? user.email)
  const t = await getTranslations("dashboard")

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            {t("badge")}
          </Badge>
          <CardTitle className="font-heading text-2xl">
            {t("greeting", { name: greeting.recipient })}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
