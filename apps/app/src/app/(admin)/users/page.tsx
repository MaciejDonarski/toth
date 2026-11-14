import { translatedMetadata } from "@/i18n/metadata"

import { Badge } from "@toth/ui/components/badge"

import { getTranslations } from "next-intl/server"

import { requirePermission } from "@/auth/dal"
import { companyUsers } from "@/composition-root"
import { toTenantContext } from "@/core/auth/application/validate-session"
import { can } from "@/core/auth/domain/permissions"
import { hasFreeSeat } from "@/core/users/domain/membership"
import { UsersPanel } from "@/ui/users/users-panel"

import {
  changeRoleAction,
  deleteMemberAction,
  inviteUserAction,
  revokeInvitationAction,
  setMemberActiveAction,
} from "./actions"

export const generateMetadata = translatedMetadata("users")

export default async function Page() {
  const user = await requirePermission("users.view")
  const seats = await companyUsers.seats(toTenantContext(user))
  const t = await getTranslations("users")

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
        <Badge
          variant="secondary"
          aria-label={t("seats", { used: seats.used, limit: seats.limit })}
        >
          {seats.used} / {seats.limit}
        </Badge>
      </div>

      <UsersPanel
        currentUserId={user.id}
        canManage={can(user.role, "users.manage")}
        canInvite={can(user.role, "users.invite")}
        limitReached={!hasFreeSeat(seats)}
        onInvite={inviteUserAction}
        onChangeRole={changeRoleAction}
        onSetActive={setMemberActiveAction}
        onDelete={deleteMemberAction}
        onRevoke={revokeInvitationAction}
      />
    </div>
  )
}
