import { FeatherIcon } from "lucide-react"

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
  return (
    <span className={cn("flex items-center gap-2 font-medium", className)}>
      <LogoMark />
      <span className="font-heading text-base">Toth</span>
    </span>
  )
}

export { Logo, LogoMark }
