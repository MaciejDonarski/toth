import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import turboPlugin from "eslint-plugin-turbo"
import { defineConfig, globalIgnores } from "eslint/config"
import tseslint from "typescript-eslint"

/**
 * Shared base ESLint config (TypeScript, no framework).
 */
export const config = defineConfig([
  globalIgnores([
    "**/dist/**",
    "**/coverage/**",
    "**/.turbo/**",
    "**/storybook-static/**",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: { turbo: turboPlugin },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Must stay last: turns off stylistic rules that Prettier owns.
  eslintConfigPrettier,
])
