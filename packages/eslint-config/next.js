import pluginNext from "@next/eslint-plugin-next"
import { defineConfig, globalIgnores } from "eslint/config"

import { config as baseConfig } from "./base.js"
import { reactRules } from "./react.js"

/**
 * ESLint config for Next.js apps.
 */
export const nextJsConfig = defineConfig([
  baseConfig,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  reactRules,
  {
    plugins: { "@next/next": pluginNext },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
    },
  },
])

/**
 * Hexagonal architecture boundaries for an app with
 * src/core (domain + application), src/infrastructure (adapters) and
 * src/app + src/ui (driving adapters).
 */
export const hexagonalBoundaries = defineConfig([
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/infrastructure/*",
                "@/app/*",
                "@/ui/*",
                "@/composition-root",
                "@/generated/*",
              ],
              message:
                "core/ must not depend on adapters. Depend on a port instead.",
            },
            {
              group: ["next", "next/*", "react", "react-dom", "@toth/ui/*"],
              message: "core/ must stay framework-agnostic.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/ui/*", "@/composition-root"],
              message: "Driven adapters must not depend on driving adapters.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/generated/*"],
              message:
                "The Prisma client is a driven adapter. Use it only from src/infrastructure/.",
            },
          ],
        },
      ],
    },
  },
])
