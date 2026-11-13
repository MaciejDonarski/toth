import eslintReact from "@eslint-react/eslint-plugin"
import jsxA11y from "eslint-plugin-jsx-a11y-x"
import pluginReactHooks from "eslint-plugin-react-hooks"
import storybook from "eslint-plugin-storybook"
import { defineConfig } from "eslint/config"
import globals from "globals"

/**
 * React rules shared by libraries and apps (no base config included).
 */
export const reactRules = defineConfig([
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ...eslintReact.configs["recommended-typescript"],
  },
  pluginReactHooks.configs.flat["recommended-latest"],
  {
    files: ["**/*.tsx"],
    ...jsxA11y.configs.recommended,
  },
  storybook.configs["flat/recommended"],
  {
    // Test files and stories may use hooks in render helpers and test-only patterns.
    files: ["**/*.test.{ts,tsx}", "**/*.stories.{ts,tsx}"],
    rules: {
      "@eslint-react/no-array-index-key": "off",
    },
  },
])
