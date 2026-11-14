"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import {
  InvitationsTable,
  type InvitationsTableProps,
} from "./invitations-table"
import { UsersTable, type UsersTableProps } from "./users-table"

export type UsersPanelProps = Omit<UsersTableProps, "onInvited"> & {
  onRevoke: InvitationsTableProps["onRevoke"]
}

/** Both tables of the users page; an invite sent from one refreshes the other. */
export function UsersPanel({ onRevoke, ...usersProps }: UsersPanelProps) {
  const t = useTranslations("users")
  const [invitationsKey, setInvitationsKey] = useState(0)

  return (
    <>
      <section
        aria-labelledby="members-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="members-heading" className="font-heading text-lg font-medium">
          {t("membersHeading")}
        </h2>
        <UsersTable
          {...usersProps}
          onInvited={() => setInvitationsKey((key) => key + 1)}
        />
      </section>

      <section
        aria-labelledby="invitations-heading"
        className="flex flex-col gap-3"
      >
        <h2
          id="invitations-heading"
          className="font-heading text-lg font-medium"
        >
          {t("invitationsHeading")}
        </h2>
        <InvitationsTable
          currentUserId={usersProps.currentUserId}
          canRevoke={usersProps.canInvite}
          refreshKey={invitationsKey}
          onRevoke={onRevoke}
        />
      </section>
    </>
  )
}
