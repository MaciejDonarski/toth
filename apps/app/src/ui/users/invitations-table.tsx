"use client"

import { useState, useTransition } from "react"

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
import { ROLE_LABELS } from "@/core/users/domain/membership"

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

const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "short",
  timeStyle: "short",
})

export function InvitationsTable({
  invitations,
  canRevoke,
  onRevoke,
}: InvitationsTableProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Brak oczekujących zaproszeń.
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
            <TableHead>Email</TableHead>
            <TableHead>Rola</TableHead>
            <TableHead>Ważne do</TableHead>
            {canRevoke && <TableHead className="text-right">Akcje</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell>{invitation.email}</TableCell>
              <TableCell>{ROLE_LABELS[invitation.role]}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {dateFormat.format(invitation.expiresAt)}
              </TableCell>
              {canRevoke && (
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    aria-label={`Odwołaj zaproszenie ${invitation.email}`}
                    onClick={() => {
                      setError(null)
                      startTransition(async () => {
                        const result = await onRevoke(invitation.id)
                        if (result.error) setError(result.error)
                      })
                    }}
                  >
                    Odwołaj
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
