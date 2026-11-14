import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
  // forbidden() / unauthorized() + forbidden.tsx (403 for missing permissions).
  experimental: { authInterrupts: true },
  async headers() {
    // Pages that carry one-time tokens in the URL or render auth state:
    // never cache them, never leak the URL via Referer.
    const noStore = [
      { key: "Cache-Control", value: "no-store" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ]
    return [
      "/login/:path*",
      "/register/:path*",
      "/verify-email",
      "/forgot-password",
      "/reset-password",
      "/accept-invite",
    ].map((source) => ({ source, headers: noStore }))
  },
  transpilePackages: ["@toth/ui", "@toth/utils", "@toth/form", "@toth/table"],
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

export default withNextIntl(nextConfig)
