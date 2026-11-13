import { FeatherIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@toth/ui/lib/utils"

function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className
      )}
    >
      <FeatherIcon className="size-4" aria-hidden />
    </div>
  )
}

function Logo({ className }: { className?: string }) {
  const t = useTranslations("common")
  return (
    <span className={cn("flex items-center gap-2 font-medium", className)}>
      <LogoMark />
      <span className="font-heading text-base">{t("brand")}</span>
    </span>
  )
}

export { Logo, LogoMark }
