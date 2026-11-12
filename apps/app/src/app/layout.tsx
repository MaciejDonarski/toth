import type { Metadata } from "next"
import { Geist_Mono, Noto_Sans, Outfit } from "next/font/google"

import "@toth/ui/globals.css"
import { cn } from "@toth/ui/lib/utils"

import { ThemeProvider } from "@/ui/components/theme-provider"

const fontHeading = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
})
const fontSans = Outfit({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Toth",
  description: "Hello world",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        fontSans.variable,
        fontHeading.variable,
        fontMono.variable
      )}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
