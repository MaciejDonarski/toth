import type { Metadata } from "next"

import { Badge } from "@toth/ui/components/badge"

import { requirePermission } from "@/auth/dal"
import { companyUsers } from "@/composition-root"
import { toTenantContext } from "@/core/auth/application/validate-session"
import { can } from "@/core/auth/domain/permissions"
import { hasFreeSeat } from "@/core/users/domain/membership"
import { InvitationsTable } from "@/ui/users/invitations-table"
import { InviteUserForm } from "@/ui/users/invite-user-form"
import { MembersTable } from "@/ui/users/members-table"

import {
  changeRoleAction,
  inviteUserAction,
  revokeInvitationAction,
  setMemberActiveAction,
} from "./actions"

export const metadata: Metadata = { title: "Użytkownicy" }

export default async function Page() {
  const user = await requirePermission("users.view")
  const { members, invitations, seats } = await companyUsers.overview(
    toTenantContext(user)
  )
  const canInvite = can(user.role, "users.invite")
  const canManage = can(user.role, "users.manage")

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold">Użytkownicy</h1>
        <Badge
          variant="secondary"
          aria-label={`Wykorzystane miejsca: ${seats.used} z ${seats.limit}`}
        >
          {seats.used} / {seats.limit}
        </Badge>
      </div>

      {canInvite && (
        <section
          aria-labelledby="invite-heading"
          className="flex flex-col gap-3"
        >
          <h2 id="invite-heading" className="font-heading text-lg font-medium">
            Zaproś osobę
          </h2>
          <InviteUserForm
            onInvite={inviteUserAction}
            limitReached={!hasFreeSeat(seats)}
          />
        </section>
      )}

      <section
        aria-labelledby="members-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="members-heading" className="font-heading text-lg font-medium">
          Członkowie firmy
        </h2>
        <MembersTable
          members={members.map((m) => ({
            id: m.id,
            email: m.email,
            name: m.name,
            role: m.role,
            status: m.status,
            lastLoginAt: m.lastLoginAt?.getTime() ?? null,
          }))}
          currentUserId={user.id}
          canManage={canManage}
          onChangeRole={changeRoleAction}
          onSetActive={setMemberActiveAction}
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
          Oczekujące zaproszenia
        </h2>
        <InvitationsTable
          invitations={invitations.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            expiresAt: i.expiresAt.getTime(),
          }))}
          canRevoke={canInvite}
          onRevoke={revokeInvitationAction}
        />
      </section>
    </div>
  )
}
