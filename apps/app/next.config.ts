import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@toth/ui", "@toth/utils", "@toth/form", "@toth/table"],
}

export default nextConfig
