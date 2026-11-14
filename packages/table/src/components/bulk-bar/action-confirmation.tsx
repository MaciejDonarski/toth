import * as React from "react"

import { Dialog } from "@toth/ui/components/dialog"

import {
  ConfirmationDialogContent,
  DeleteDialogContent,
} from "../../internal/confirmation-dialog"
import type {
  DataTableAction,
  DataTableActionEntry,
} from "../data-table/data-table.types"

// `DataTableAction.confirm`, made real: the actions handed to `Actions` with every confirmable
// `onClick` swapped for one that opens a dialog, and the dialog that runs the original.
//
// The swap happens on the descriptors rather than inside `Actions`, which knows nothing of
// confirmation — it draws a button or a menu row the same either way, and the dialog lives beside
// it. The click that asked is kept and handed to the original `onClick` when the user confirms, so
// a handler reading its event still gets one.

interface Pending {
  action: DataTableAction
  event: React.MouseEvent<HTMLElement>
}

/** Whether an action runs something itself — the only kind there is anything to confirm about. */
function isConfirmable(action: DataTableAction) {
  return (
    action.confirm !== undefined &&
    typeof action.onClick === "function" &&
    !("menuItems" in action && action.menuItems) &&
    !("panel" in action && action.panel !== undefined)
  )
}

function useActionConfirmation(entries: readonly DataTableActionEntry[]): {
  actions: DataTableActionEntry[]
  dialog: React.ReactElement
} {
  const [pending, setPending] = React.useState<Pending | null>(null)
  const [open, setOpen] = React.useState(false)

  const actions = React.useMemo(() => {
    const wrap = (action: DataTableAction): DataTableAction => {
      if (!isConfirmable(action)) return action

      // `confirm` stays behind: what `Actions` receives is an ordinary action.
      const { confirm: _confirm, ...rest } = action

      return {
        ...rest,
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          setPending({ action, event })
          setOpen(true)
        },
      } as DataTableAction
    }

    return entries.map((entry) =>
      Array.isArray(entry) ? entry.map(wrap) : wrap(entry)
    )
  }, [entries])

  const confirm = pending?.action.confirm
  // A destructive action gets the dialog whose confirm button says so in red.
  const Content =
    pending?.action.variant === "destructive"
      ? DeleteDialogContent
      : ConfirmationDialogContent

  // The dialog stays mounted with its last action while it animates out; only `open` changes.
  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      {pending && confirm ? (
        <Content
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          cancelLabel={confirm.cancelLabel}
          onConfirm={() => {
            const onClick = pending.action.onClick as
              React.MouseEventHandler<HTMLElement> | undefined

            setOpen(false)
            onClick?.(pending.event)
          }}
        />
      ) : null}
    </Dialog>
  )

  return { actions, dialog }
}

export { useActionConfirmation }
