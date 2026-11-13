import { withThemeByClassName } from "@storybook/addon-themes"
import type { Preview, ReactRenderer } from "@storybook/react-vite"

import "@toth/ui/storybook-fonts.css"
import "@toth/ui/globals.css"

const preview: Preview = {
  parameters: {
    layout: "centered",
    a11y: { test: "todo" },
  },
  decorators: [
    withThemeByClassName<ReactRenderer>({
      themes: { light: "", dark: "dark" },
      defaultTheme: "light",
    }),
    (Story) => (
      <div className="font-sans antialiased">
        <Story />
      </div>
    ),
  ],
}

export default preview
