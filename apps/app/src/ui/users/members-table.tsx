"use client"

import { useState, useTransition } from "react"
import { useFormatter, useTranslations } from "next-intl"

import { Alert, AlertDescription } from "@toth/ui/components/alert"
import { Badge } from "@toth/ui/components/badge"
import { Button } from "@toth/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@toth/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@toth/ui/components/table"

import { ROLES, type Role } from "@/core/auth/domain/role"

export type MemberRow = {
  id: string
  email: string
  name: string | null
  /** Formatted for display, or null. */
  phone: string | null
  role: Role
  status: "ACTIVE" | "DISABLED"
  /** Epoch ms, or null if the user never signed in. */
  lastLoginAt: number | null
}

type ActionResult = { error?: string }

export type MembersTableProps = {
  members: MemberRow[]
  currentUserId: string
  /** Show role and status controls (permission users.manage). */
  canManage: boolean
  onChangeRole: (userId: string, role: Role) => Promise<ActionResult>
  onSetActive: (userId: string, active: boolean) => Promise<ActionResult>
}

const DATE_TIME = { dateStyle: "short", timeStyle: "short" } as const

export function MembersTable(props: MembersTableProps) {
  const { members, currentUserId, canManage } = props
  const t = useTranslations()
  const format = useFormatter()
  const roleItems = ROLES.map((role) => ({
    value: role,
    label: t(`roles.${role}`),
  }))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<ActionResult>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div aria-live="polite">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      <Table aria-busy={pending || undefined}>
        <TableHeader>
          <TableRow>
            <TableHead>{t("users.columns.user")}</TableHead>
            <TableHead>{t("users.columns.phone")}</TableHead>
            <TableHead>{t("users.columns.role")}</TableHead>
            <TableHead>{t("users.columns.status")}</TableHead>
            <TableHead>{t("users.columns.lastLogin")}</TableHead>
            {canManage && (
              <TableHead className="text-right">
                {t("users.columns.actions")}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const self = member.id === currentUserId
            const editable = canManage && !self
            return (
              <TableRow key={member.id} data-status={member.status}>
                <TableCell>
                  <div className="font-medium">
                    {member.name ?? member.email}
                    {self && (
                      <span className="text-muted-foreground">
                        {" "}
                        {t("common.you")}
                      </span>
                    )}
                  </div>
                  {member.name && (
                    <div className="text-sm text-muted-foreground">
                      {member.email}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                  {member.phone ?? "—"}
                </TableCell>
                <TableCell>
                  {editable ? (
                    <Select
                      items={roleItems}
                      value={member.role}
                      onValueChange={(role) => {
                        if (role && role !== member.role) {
                          run(() => props.onChangeRole(member.id, role as Role))
                        }
                      }}
                      disabled={pending}
                    >
                      <SelectTrigger
                        className="w-40"
                        aria-label={t("users.roleFor", { email: member.email })}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    t(`roles.${member.role}`)
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      member.status === "ACTIVE" ? "secondary" : "outline"
                    }
                  >
                    {t(`users.status.${member.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.lastLoginAt
                    ? format.dateTime(member.lastLoginAt, DATE_TIME)
                    : t("common.never")}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    {editable && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        aria-label={t(
                          member.status === "ACTIVE"
                            ? "users.disableFor"
                            : "users.enableFor",
                          { email: member.email }
                        )}
                        onClick={() =>
                          run(() =>
                            props.onSetActive(
                              member.id,
                              member.status !== "ACTIVE"
                            )
                          )
                        }
                      >
                        {t(
                          member.status === "ACTIVE"
                            ? "users.disable"
                            : "users.enable"
                        )}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
