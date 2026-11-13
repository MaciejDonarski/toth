"use client"

import { useState, useTransition } from "react"

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
import { ROLE_LABELS } from "@/core/users/domain/membership"

export type MemberRow = {
  id: string
  email: string
  name: string | null
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

const ROLE_ITEMS = ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}))
const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "short",
  timeStyle: "short",
})

export function MembersTable(props: MembersTableProps) {
  const { members, currentUserId, canManage } = props
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
            <TableHead>Użytkownik</TableHead>
            <TableHead>Rola</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ostatnie logowanie</TableHead>
            {canManage && <TableHead className="text-right">Akcje</TableHead>}
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
                      <span className="text-muted-foreground"> (Ty)</span>
                    )}
                  </div>
                  {member.name && (
                    <div className="text-sm text-muted-foreground">
                      {member.email}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {editable ? (
                    <Select
                      items={ROLE_ITEMS}
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
                        aria-label={`Rola: ${member.email}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    ROLE_LABELS[member.role]
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      member.status === "ACTIVE" ? "secondary" : "outline"
                    }
                  >
                    {member.status === "ACTIVE" ? "Aktywny" : "Wyłączony"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.lastLoginAt
                    ? dateFormat.format(member.lastLoginAt)
                    : "Nigdy"}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    {editable && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        aria-label={`${member.status === "ACTIVE" ? "Wyłącz" : "Włącz"} ${member.email}`}
                        onClick={() =>
                          run(() =>
                            props.onSetActive(
                              member.id,
                              member.status !== "ACTIVE"
                            )
                          )
                        }
                      >
                        {member.status === "ACTIVE" ? "Wyłącz" : "Włącz"}
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
