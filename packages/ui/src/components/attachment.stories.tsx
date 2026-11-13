import type { Meta, StoryObj } from "@storybook/react-vite"
import { FileTextIcon, XIcon } from "lucide-react"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@toth/ui/components/attachment"

const meta = {
  title: "UI/Attachment",
  component: Attachment,
  tags: ["autodocs"],
  argTypes: {
    state: {
      control: "select",
      options: ["idle", "uploading", "processing", "error", "done"],
    },
    size: { control: "inline-radio", options: ["default", "sm", "xs"] },
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
  },
  args: { state: "done", size: "default", orientation: "horizontal" },
  render: (args) => (
    <Attachment {...args}>
      <AttachmentMedia>
        <FileTextIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>quarterly-report.pdf</AttachmentTitle>
        <AttachmentDescription>2.4 MB</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Remove">
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  ),
} satisfies Meta<typeof Attachment>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Uploading: Story = { args: { state: "uploading" } }
export const Error: Story = { args: { state: "error" } }
export const Vertical: Story = { args: { orientation: "vertical" } }
export const Group: Story = {
  render: (args) => (
    <AttachmentGroup>
      {["design.fig", "notes.md", "logo.svg"].map((name) => (
        <Attachment key={name} {...args} size="sm">
          <AttachmentMedia>
            <FileTextIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{name}</AttachmentTitle>
          </AttachmentContent>
        </Attachment>
      ))}
    </AttachmentGroup>
  ),
}
