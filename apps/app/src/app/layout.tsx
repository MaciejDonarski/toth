import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"
import { Geist_Mono, Noto_Sans, Outfit } from "next/font/google"

import "@toth/ui/globals.css"
import { cn } from "@toth/ui/lib/utils"

import "@/ui/zod-locale"
import { AppFormDefaults } from "@/ui/components/app-form-defaults"
import { ThemeProvider } from "@/ui/components/theme-provider"

const fontHeading = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
})
const fontSans = Outfit({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata")
  return {
    title: { default: t("appTitle"), template: t("titleTemplate") },
    description: t("description"),
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        fontSans.variable,
        fontHeading.variable,
        fontMono.variable
      )}
    >
      <body>
        <NextIntlClientProvider>
          <ThemeProvider>
            <AppFormDefaults>{children}</AppFormDefaults>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
