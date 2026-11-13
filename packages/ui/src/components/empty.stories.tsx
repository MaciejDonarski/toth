import type { Meta, StoryObj } from "@storybook/react-vite"
import { FolderIcon } from "lucide-react"

import { Button } from "@toth/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@toth/ui/components/empty"

const meta = {
  title: "UI/Empty",
  component: Empty,
  tags: ["autodocs"],
  render: (args) => (
    <Empty {...args} className="w-[28rem] border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderIcon />
        </EmptyMedia>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any projects yet. Get started by creating
          your first project.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          <Button>Create project</Button>
          <Button variant="outline">Import project</Button>
        </div>
      </EmptyContent>
    </Empty>
  ),
} satisfies Meta<typeof Empty>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
