import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"

import { Logo } from "@/ui/brand/logo"

function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common")
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <Link href="/" aria-label={t("homeLink")}>
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/placeholder.svg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}

export { AuthLayout }
