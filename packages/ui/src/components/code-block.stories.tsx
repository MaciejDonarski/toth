import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@toth/ui/components/code-block"

const code = `import { Button } from "@toth/ui/components/button"

export function App() {
  return <Button>Hello</Button>
}
`

const meta = {
  title: "UI/CodeBlock",
  component: CodeBlock,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "destructive"] },
    size: { control: "inline-radio", options: ["default", "sm"] },
  },
  args: { variant: "default", size: "default" },
  render: (args) => (
    <CodeBlock {...args} className="w-[32rem]">
      <CodeBlockHeader>
        <CodeBlockTitle>app.tsx</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent lineNumbers>{code}</CodeBlockContent>
      <CodeBlockFooter>TypeScript · 5 lines</CodeBlockFooter>
    </CodeBlock>
  ),
} satisfies Meta<typeof CodeBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Small: Story = { args: { size: "sm" } }
export const Destructive: Story = { args: { variant: "destructive" } }
export const Diff: Story = {
  render: (args) => (
    <CodeBlock {...args} className="w-[32rem]">
      <CodeBlockActions>
        <CodeBlockCopyButton value={"const a = 2"} />
      </CodeBlockActions>
      <CodeBlockContent>
        <CodeBlockLine variant="removed">const a = 1</CodeBlockLine>
        <CodeBlockLine variant="added">const a = 2</CodeBlockLine>
        <CodeBlockLine variant="highlighted">export default a</CodeBlockLine>
      </CodeBlockContent>
    </CodeBlock>
  ),
}
