import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@toth/ui/components/attachment"

describe("Attachment", () => {
  it("renders content and exposes state, size and orientation", () => {
    render(
      <AttachmentGroup>
        <Attachment data-testid="att" state="uploading" size="sm">
          <AttachmentMedia>📄</AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>report.pdf</AttachmentTitle>
            <AttachmentDescription>1.2 MB</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>
    )
    const att = screen.getByTestId("att")
    expect(att).toHaveAttribute("data-state", "uploading")
    expect(att).toHaveAttribute("data-size", "sm")
    expect(att).toHaveAttribute("data-orientation", "horizontal")
    expect(screen.getByText("report.pdf")).toBeInTheDocument()
    expect(screen.getByText("1.2 MB")).toBeInTheDocument()
  })

  it("fires action and trigger handlers", async () => {
    const onRemove = vi.fn()
    const onOpen = vi.fn()
    render(
      <Attachment>
        <AttachmentTrigger aria-label="Open file" onClick={onOpen} />
        <AttachmentContent>
          <AttachmentTitle>image.png</AttachmentTitle>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label="Remove" onClick={onRemove}>
            x
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
    )
    const trigger = screen.getByRole("button", { name: "Open file" })
    expect(trigger).toHaveAttribute("type", "button")
    await userEvent.click(trigger)
    expect(onOpen).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole("button", { name: "Remove" }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
