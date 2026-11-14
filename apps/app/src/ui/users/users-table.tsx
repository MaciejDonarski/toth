"use client"

import { useMemo, useState } from "react"
import { MailPlusIcon, ShieldIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import {
  AsyncDataTable,
  type DataTableColumn,
  type DataTableFilter,
  type PlainTableCellProps,
} from "@toth/table"
import { Badge } from "@toth/ui/components/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@toth/ui/components/dialog"

import { ROLES, type Role } from "@/core/auth/domain/role"
import {
  useDeleteAction,
  useRowMutation,
  useStatusActions,
  type RowActionResult,
} from "@/ui/data-table/row-actions"
import { useEndpointTable } from "@/ui/data-table/use-endpoint-table"

import { ChangeRoleDialog } from "./change-role-dialog"
import { InviteUserForm, type InviteUserFormProps } from "./invite-user-form"
import type { MemberRow } from "./rows"
import { UserAvatar } from "./user-avatar"

export type UsersTableProps = {
  currentUserId: string
  /** Row actions (permission users.manage). */
  canManage: boolean
  /** The "Invite user" table action (permission users.invite). */
  canInvite: boolean
  limitReached: boolean
  onInvite: InviteUserFormProps["onInvite"]
  /** After a successful invite — refresh the invitations table. */
  onInvited: () => void
  onChangeRole: (userId: string, role: Role) => Promise<RowActionResult>
  onSetActive: (userId: string, active: boolean) => Promise<RowActionResult>
  onDelete: (userId: string) => Promise<RowActionResult>
}

const displayName = (row: MemberRow) => row.name ?? row.email

function NameCell({ row }: PlainTableCellProps<MemberRow>) {
  const t = useTranslations("users")
  return (
    <span className="flex min-w-0 items-center gap-2">
      <UserAvatar name={displayName(row)} color={row.color} size="sm" />
      <span className="truncate font-medium">{displayName(row)}</span>
      {row.isSelf && <Badge variant="outline">{t("you")}</Badge>}
    </span>
  )
}

function EmailCell({ row }: PlainTableCellProps<MemberRow>) {
  return (
    <a
      href={`mailto:${row.email}`}
      className="truncate underline-offset-4 hover:underline"
    >
      {row.email}
    </a>
  )
}

function PhoneCell({ row }: PlainTableCellProps<MemberRow>) {
  return (
    <span className="whitespace-nowrap text-muted-foreground">
      {row.phone ?? "—"}
    </span>
  )
}

function RoleCell({ row }: PlainTableCellProps<MemberRow>) {
  const t = useTranslations("roles")
  return t(row.role)
}

function StatusCell({ row }: PlainTableCellProps<MemberRow>) {
  const t = useTranslations("users.status")
  return (
    <Badge variant={row.status === "ACTIVE" ? "secondary" : "outline"}>
      {t(row.status)}
    </Badge>
  )
}

export function UsersTable(props: UsersTableProps) {
  const { currentUserId, canManage, canInvite } = props
  const t = useTranslations()
  const router = useRouter()
  const table = useEndpointTable<MemberRow>("/api/tables/users")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState<MemberRow | null>(null)

  const afterChange = () => {
    table.refresh()
    router.refresh() // seat counter in the page header
  }
  const mutation = useRowMutation(afterChange)
  const manageable = (row: MemberRow) => canManage && row.manageable

  const statusActions = useStatusActions<MemberRow>({
    isActive: (row) => row.status === "ACTIVE",
    canChange: manageable,
    disabled: mutation.busy,
    onChange: (row, active) =>
      mutation.run(
        row.id,
        () => props.onSetActive(row.id, active),
        t(active ? "users.actions.activated" : "users.actions.deactivated", {
          name: displayName(row),
        })
      ),
  })

  const deleteAction = useDeleteAction<MemberRow>({
    canDelete: manageable,
    disabled: mutation.busy,
    confirm: (row) => ({
      title: t("users.confirmDelete.title", { name: displayName(row) }),
      description: t("users.confirmDelete.description"),
    }),
    onDelete: (row) =>
      mutation.run(
        row.id,
        () => props.onDelete(row.id),
        t("users.actions.deleted", { name: displayName(row) })
      ),
  })

  const columns = useMemo<DataTableColumn<MemberRow>[]>(
    () => [
      {
        id: "name",
        label: t("users.columns.name"),
        isSortable: true,
        template: NameCell,
        minWidth: 220,
      },
      {
        id: "email",
        label: t("users.columns.email"),
        isSortable: true,
        template: EmailCell,
        minWidth: 200,
      },
      {
        id: "phone",
        label: t("users.columns.phone"),
        isSortable: true,
        template: PhoneCell,
      },
      {
        id: "role",
        label: t("users.columns.role"),
        isSortable: true,
        template: RoleCell,
      },
      {
        id: "status",
        label: t("users.columns.status"),
        template: StatusCell,
      },
    ],
    [t]
  )

  const filters = useMemo<DataTableFilter[]>(
    () => [
      { field: "name", label: t("users.columns.name"), order: 10 },
      { field: "email", label: t("users.columns.email"), order: 20 },
      { field: "phone", label: t("users.columns.phone"), order: 30 },
      {
        field: "role",
        label: t("users.columns.role"),
        type: "multi-select",
        order: 40,
        options: ROLES.map((role) => ({
          value: role,
          label: t(`roles.${role}`),
        })),
      },
    ],
    [t]
  )

  return (
    <>
      <AsyncDataTable<MemberRow>
        id="users"
        persistState
        userId={currentUserId}
        withPagination
        itemsLabel={t("users.itemsLabel")}
        columns={columns}
        filters={filters}
        getRowLabel={displayName}
        {...table.tableProps}
        error={table.error ? t("errors.tableLoad") : undefined}
        headerActions={
          canInvite
            ? [
                {
                  label: t("users.invite.open"),
                  icon: MailPlusIcon,
                  onClick: () => setInviteOpen(true),
                },
              ]
            : undefined
        }
        rowActions={
          canManage
            ? [
                [
                  {
                    key: "changeRole",
                    label: t("users.actions.changeRole"),
                    icon: ShieldIcon,
                    hidden: (row) => !manageable(row),
                    disabled: mutation.busy,
                    onClick: setRoleTarget,
                  },
                  ...statusActions,
                ],
                deleteAction,
              ]
            : undefined
        }
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.invite.title")}</DialogTitle>
            <DialogDescription>
              {t("users.invite.description")}
            </DialogDescription>
          </DialogHeader>
          <InviteUserForm
            onInvite={props.onInvite}
            limitReached={props.limitReached}
            onCancel={() => setInviteOpen(false)}
            onSent={() => {
              setInviteOpen(false)
              props.onInvited()
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>

      <ChangeRoleDialog
        member={
          roleTarget && { name: displayName(roleTarget), role: roleTarget.role }
        }
        onClose={() => setRoleTarget(null)}
        onSubmit={async (role) => {
          if (!roleTarget) return {}
          const result = await props.onChangeRole(roleTarget.id, role)
          if (!result.error) afterChange()
          return result
        }}
      />
    </>
  )
}
