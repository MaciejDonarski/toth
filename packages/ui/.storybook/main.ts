import tailwindcss from "@tailwindcss/vite"
import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  async viteFinal(config) {
    return {
      ...config,
      plugins: [...(config.plugins ?? []), tailwindcss()],
      build: {
        ...config.build,
        rolldownOptions: {
          ...config.build?.rolldownOptions,
          // Base UI ships "use client" directives; they are irrelevant here.
          onwarn(warning, warn) {
            if (warning.code === "MODULE_LEVEL_DIRECTIVE") return
            warn(warning)
          },
        },
      },
    }
  },
}

export default config
