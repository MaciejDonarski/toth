"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useFormatter, useTranslations } from "next-intl"

import {
  AsyncDataTable,
  type DataTableColumn,
  type DataTableFilter,
  type PlainTableCellProps,
} from "@toth/table"

import { ROLES } from "@/core/auth/domain/role"
import {
  useDeleteAction,
  useRowMutation,
  type RowActionResult,
} from "@/ui/data-table/row-actions"
import { useEndpointTable } from "@/ui/data-table/use-endpoint-table"

import type { InvitationRow } from "./rows"

export type InvitationsTableProps = {
  currentUserId: string
  /** The "Cancel invitation" row action (permission users.invite). */
  canRevoke: boolean
  /** Change it to refetch — after an invite was sent from the users table. */
  refreshKey: number
  onRevoke: (invitationId: string) => Promise<RowActionResult>
}

const DATE_TIME = { dateStyle: "short", timeStyle: "short" } as const

function EmailCell({ row }: PlainTableCellProps<InvitationRow>) {
  return (
    <a
      href={`mailto:${row.email}`}
      className="truncate underline-offset-4 hover:underline"
    >
      {row.email}
    </a>
  )
}

function RoleCell({ row }: PlainTableCellProps<InvitationRow>) {
  const t = useTranslations("roles")
  return t(row.role)
}

function ExpiresCell({ row }: PlainTableCellProps<InvitationRow>) {
  const format = useFormatter()
  return (
    <span className="whitespace-nowrap text-muted-foreground">
      {format.dateTime(row.expiresAt, DATE_TIME)}
    </span>
  )
}

export function InvitationsTable({
  currentUserId,
  canRevoke,
  refreshKey,
  onRevoke,
}: InvitationsTableProps) {
  const t = useTranslations()
  const router = useRouter()
  const table = useEndpointTable<InvitationRow>(
    "/api/tables/invitations",
    refreshKey
  )
  const mutation = useRowMutation(() => {
    table.refresh()
    router.refresh() // seat counter in the page header
  })

  const revokeAction = useDeleteAction<InvitationRow>({
    label: t("users.invitations.revoke"),
    disabled: mutation.busy,
    confirm: (row) => ({
      title: t("users.invitations.confirmTitle", { email: row.email }),
      description: t("users.invitations.confirmDescription"),
    }),
    onDelete: (row) =>
      mutation.run(
        row.id,
        () => onRevoke(row.id),
        t("users.invitations.revoked", { email: row.email })
      ),
  })

  const columns = useMemo<DataTableColumn<InvitationRow>[]>(
    () => [
      {
        id: "email",
        label: t("users.columns.email"),
        isSortable: true,
        template: EmailCell,
        minWidth: 220,
      },
      {
        id: "role",
        label: t("users.columns.role"),
        isSortable: true,
        template: RoleCell,
      },
      {
        id: "expiresAt",
        label: t("users.columns.expiresAt"),
        isSortable: true,
        template: ExpiresCell,
      },
    ],
    [t]
  )

  const filters = useMemo<DataTableFilter[]>(
    () => [
      { field: "email", label: t("users.columns.email"), order: 10 },
      {
        field: "role",
        label: t("users.columns.role"),
        type: "multi-select",
        order: 20,
        options: ROLES.map((role) => ({
          value: role,
          label: t(`roles.${role}`),
        })),
      },
    ],
    [t]
  )

  return (
    <AsyncDataTable<InvitationRow>
      id="invitations"
      persistState
      userId={currentUserId}
      withPagination
      itemsLabel={t("users.invitations.itemsLabel")}
      columns={columns}
      filters={filters}
      getRowLabel={(row) => row.email}
      {...table.tableProps}
      error={table.error ? t("errors.tableLoad") : undefined}
      rowActions={canRevoke ? [revokeAction] : undefined}
    />
  )
}
