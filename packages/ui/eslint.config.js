import { config } from "@toth/eslint-config/react-internal"
import { defineConfig } from "eslint/config"

export default defineConfig([
  config,
  {
    // Vendored shadcn/ui source (managed by `shadcn add`). Keep it byte-for-byte
    // with upstream so components can be re-synced; relax only the rules that
    // upstream intentionally violates.
    files: ["src/components/*.tsx", "src/hooks/*.ts", "src/lib/*.{ts,tsx}"],
    ignores: ["**/*.test.tsx", "**/*.stories.tsx"],
    rules: {
      "@eslint-react/no-nested-component-definitions": "off",
      "@eslint-react/no-array-index-key": "off",
      "@eslint-react/no-context-provider": "off",
      "@eslint-react/no-use-context": "off",
      "@eslint-react/set-state-in-effect": "off",
      "@eslint-react/use-state": "off",
      "@eslint-react/dom-no-dangerously-set-innerhtml": "off",
      "react-hooks/set-state-in-effect": "off",
      // False positives: content/control is supplied through Base UI `render`
      // props or by the consumer.
      "jsx-a11y-x/anchor-has-content": "off",
      "jsx-a11y-x/label-has-associated-control": "off",
      "jsx-a11y-x/no-noninteractive-tabindex": "off",
      "jsx-a11y-x/click-events-have-key-events": "off",
      "jsx-a11y-x/no-noninteractive-element-interactions": "off",
    },
  },
  {
    // Base UI `render={<a />}` / `render={<h3 />}` receive their content from
    // the component's children, which the a11y rules cannot see.
    files: ["**/*.test.tsx", "**/*.stories.tsx"],
    rules: {
      "jsx-a11y-x/anchor-has-content": "off",
      "jsx-a11y-x/heading-has-content": "off",
    },
  },
])
