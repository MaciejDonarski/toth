import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@toth/ui/components/empty"

function TablePlaceholder() {
  return (
    <Empty className="w-96 border border-dashed">
      <EmptyHeader>
        <EmptyTitle>@toth/table</EmptyTitle>
        <EmptyDescription>
          The data table component will live here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

const meta = {
  title: "Table/Overview",
  component: TablePlaceholder,
} satisfies Meta<typeof TablePlaceholder>

export default meta
export const Placeholder: StoryObj<typeof meta> = {}
