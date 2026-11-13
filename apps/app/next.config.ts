import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // forbidden() / unauthorized() + forbidden.tsx (403 for missing permissions).
  experimental: { authInterrupts: true },
  transpilePackages: ["@toth/ui", "@toth/utils", "@toth/form", "@toth/table"],
}

export default nextConfig
