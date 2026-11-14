import { companyUsers } from "@/composition-root"
import { ROLES } from "@/core/auth/domain/role"
import {
  INVITATION_SORT_FIELDS,
  type InvitationFilters,
} from "@/core/users/application/ports/company-users-repository"
import type { InvitationRow } from "@/ui/users/rows"

import { multiSelectFilter, textFilter } from "../_lib/table-filters"
import { tableRoute } from "../_lib/table-route"

export const POST = tableRoute({
  permission: "users.view",
  sortable: INVITATION_SORT_FIELDS,
  filters: {
    email: textFilter,
    role: multiSelectFilter(ROLES),
  } satisfies Record<keyof InvitationFilters, unknown>,
  load: (ctx, query) => companyUsers.listInvitations(ctx, query),
  toRow: (invitation): InvitationRow => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt.getTime(),
  }),
})
