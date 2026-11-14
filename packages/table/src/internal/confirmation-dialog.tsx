"use client"

import type * as React from "react"

import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@toth/ui/components/dialog"

import { useTableMessages } from "../hooks/use-table-locale"
import { Button } from "./button"

export interface ConfirmationDialogContentProps {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Runs on confirm. The dialog stays open — closing is the caller's. */
  onConfirm: () => void
  confirmLabel?: React.ReactNode
  cancelLabel?: React.ReactNode
  /** The confirmed work is running: spinner on confirm, cancel disabled. */
  pending?: boolean
}

function ConfirmationShell({
  title,
  description,
  onConfirm,
  confirmLabel,
  cancelLabel,
  pending,
  destructive,
}: ConfirmationDialogContentProps & { destructive: boolean }) {
  const messages = useTableMessages()

  return (
    <DialogContent showCloseButton={false} aria-busy={pending || undefined}>
      <DialogHeader>
        <DialogTitle>{title ?? messages.confirm.title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" disabled={pending} />}>
          {cancelLabel ?? messages.confirm.cancel}
        </DialogClose>
        <Button
          variant={destructive ? "destructive" : "default"}
          icon={destructive ? "trash" : "check"}
          loading={pending}
          onClick={onConfirm}
        >
          {confirmLabel ??
            (destructive ? messages.confirm.delete : messages.confirm.confirm)}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

/** A dialog that asks before it acts: Cancel, then a primary confirm. */
function ConfirmationDialogContent(props: ConfirmationDialogContentProps) {
  return <ConfirmationShell {...props} destructive={false} />
}

/** A dialog that asks before it destroys: Cancel, then a destructive confirm. */
function DeleteDialogContent(props: ConfirmationDialogContentProps) {
  return <ConfirmationShell {...props} destructive />
}

export { ConfirmationDialogContent, DeleteDialogContent }
