import { withThemeByClassName } from "@storybook/addon-themes"
import type { Preview, ReactRenderer } from "@storybook/react-vite"

import "../src/styles/storybook-fonts.css"
import "../src/styles/globals.css"

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
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
