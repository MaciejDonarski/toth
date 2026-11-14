"use client"

import { useState, useTransition } from "react"
import { useFormatter, useTranslations } from "next-intl"

import { Alert, AlertDescription } from "@toth/ui/components/alert"
import { Button } from "@toth/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@toth/ui/components/table"

import type { Role } from "@/core/auth/domain/role"

export type InvitationRow = {
  id: string
  email: string
  role: Role
  /** Epoch ms. */
  expiresAt: number
}

export type InvitationsTableProps = {
  invitations: InvitationRow[]
  canRevoke: boolean
  onRevoke: (invitationId: string) => Promise<{ error?: string }>
}

const DATE_TIME = { dateStyle: "short", timeStyle: "short" } as const

export function InvitationsTable({
  invitations,
  canRevoke,
  onRevoke,
}: InvitationsTableProps) {
  const t = useTranslations()
  const format = useFormatter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("users.noInvitations")}
      </p>
    )
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("users.columns.email")}</TableHead>
            <TableHead>{t("users.columns.role")}</TableHead>
            <TableHead>{t("users.columns.expiresAt")}</TableHead>
            {canRevoke && (
              <TableHead className="text-right">
                {t("users.columns.actions")}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell>{invitation.email}</TableCell>
              <TableCell>{t(`roles.${invitation.role}`)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format.dateTime(invitation.expiresAt, DATE_TIME)}
              </TableCell>
              {canRevoke && (
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    aria-label={t("users.revokeFor", {
                      email: invitation.email,
                    })}
                    onClick={() => {
                      setError(null)
                      startTransition(async () => {
                        const result = await onRevoke(invitation.id)
                        if (result.error) setError(result.error)
                      })
                    }}
                  >
                    {t("users.revoke")}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
