import type { Meta, StoryObj } from "@storybook/react-vite"
import { FileSearchIcon, TerminalIcon } from "lucide-react"

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@toth/ui/components/trace"

const meta = {
  title: "UI/Trace",
  component: Trace,
  tags: ["autodocs"],
  render: (args) => (
    <Trace {...args} className="w-[28rem]">
      <TraceLine>
        <TraceIcon>
          <FileSearchIcon />
        </TraceIcon>
        <TraceTitle>Read 4 files</TraceTitle>
        <TraceDescription>src/components</TraceDescription>
      </TraceLine>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceIcon>
            <TerminalIcon />
          </TraceIcon>
          <TraceTitle>Ran 2 commands</TraceTitle>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <TraceLine>
            <TraceTitle>pnpm install</TraceTitle>
          </TraceLine>
          <TraceLine status="error">
            <TraceTitle>pnpm test</TraceTitle>
            <TraceDescription>1 failed</TraceDescription>
          </TraceLine>
        </TraceCollapsibleContent>
      </TraceCollapsible>
      <TraceLine status="running">
        <TraceTitle>Fixing failing test…</TraceTitle>
      </TraceLine>
      <TraceLine status="pending">
        <TraceTitle>Re-run test suite</TraceTitle>
      </TraceLine>
    </Trace>
  ),
} satisfies Meta<typeof Trace>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
