"use client"

import { useCallback, useState, useTransition } from "react"
import { Trash2Icon, UserCheckIcon, UserXIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { toast } from "@toth/ui/components/toast"
import type { DataTableActionConfirm, DataTableRowAction } from "@toth/table"

/**
 * Row actions every table reuses, so "activate/deactivate" and "delete" look,
 * read and behave the same everywhere. Each returns plain `@toth/table`
 * descriptors; put them into `rowActions` next to the table's own:
 *
 *     rowActions={[[edit, ...statusActions], deleteAction]}
 *
 * `deleteAction` is a group (an array) on purpose — the table draws a
 * separator before it.
 */

/** What a row mutation (a server action) answers: an error message, or nothing. */
export type RowActionResult = { error?: string }

/**
 * Runs row mutations: one at a time, toast on error (or on success when a
 * message is given), `onDone` after a success — refetch the table there.
 */
export function useRowMutation(onDone: () => void) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const run = useCallback(
    (
      rowId: string,
      mutation: () => Promise<RowActionResult>,
      successMessage?: string
    ) => {
      setPendingId(rowId)
      startTransition(async () => {
        try {
          const result = await mutation()
          if (result.error) {
            toast.add({ type: "error", title: result.error })
            return
          }
          if (successMessage)
            toast.add({ type: "success", title: successMessage })
          onDone()
        } finally {
          setPendingId(null)
        }
      })
    },
    [onDone]
  )

  return { run, pendingId, busy: pendingId !== null }
}

type RowGuard<TRow> = (row: TRow) => boolean

export type StatusActionsOptions<TRow> = {
  isActive: (row: TRow) => boolean
  /** Rows the actions apply to at all; the rest show neither. */
  canChange?: RowGuard<TRow>
  onChange: (row: TRow, active: boolean) => void
  /** Disable both while something is running. */
  disabled?: boolean
}

/** "Aktywuj" on an inactive row, "Dezaktywuj" on an active one — never both. */
export function useStatusActions<TRow>({
  isActive,
  canChange = () => true,
  onChange,
  disabled,
}: StatusActionsOptions<TRow>): DataTableRowAction<TRow>[] {
  const t = useTranslations("rowActions")
  return [
    {
      key: "activate",
      label: t("activate"),
      icon: UserCheckIcon,
      hidden: (row) => !canChange(row) || isActive(row),
      disabled,
      onClick: (row) => onChange(row, true),
    },
    {
      key: "deactivate",
      label: t("deactivate"),
      icon: UserXIcon,
      hidden: (row) => !canChange(row) || !isActive(row),
      disabled,
      onClick: (row) => onChange(row, false),
    },
  ]
}

export type DeleteActionOptions<TRow> = {
  onDelete: (row: TRow) => void
  /** The question, per row so it can name it. */
  confirm: (row: TRow) => DataTableActionConfirm
  canDelete?: RowGuard<TRow>
  /** Defaults to "Usuń". */
  label?: string
  disabled?: boolean
}

/** A destructive, confirmed delete, as its own group behind a separator. */
export function useDeleteAction<TRow>({
  onDelete,
  confirm,
  canDelete = () => true,
  label,
  disabled,
}: DeleteActionOptions<TRow>): DataTableRowAction<TRow>[] {
  const t = useTranslations("rowActions")
  return [
    {
      key: "delete",
      label: label ?? t("delete"),
      icon: Trash2Icon,
      variant: "destructive",
      hidden: (row) => !canDelete(row),
      disabled,
      confirm: (row) => ({
        confirmLabel: label ?? t("delete"),
        ...confirm(row),
      }),
      onClick: onDelete,
    },
  ]
}
