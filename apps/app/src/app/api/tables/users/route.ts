import { companyUsers } from "@/composition-root"
import { ROLES } from "@/core/auth/domain/role"
import {
  MEMBER_SORT_FIELDS,
  type MemberFilters,
} from "@/core/users/application/ports/company-users-repository"
import { isManageableMember } from "@/core/users/domain/membership"
import { formatPhone } from "@/core/users/domain/profile"
import type { MemberRow } from "@/ui/users/rows"

import { multiSelectFilter, textFilter } from "../_lib/table-filters"
import { tableRoute } from "../_lib/table-route"

export const POST = tableRoute({
  permission: "users.view",
  sortable: MEMBER_SORT_FIELDS,
  filters: {
    name: textFilter,
    email: textFilter,
    phone: textFilter,
    role: multiSelectFilter(ROLES),
  } satisfies Record<keyof MemberFilters, unknown>,
  load: (ctx, query) => companyUsers.listMembers(ctx, query),
  toRow: (member, user): MemberRow => ({
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone ? formatPhone(member.phone) : null,
    color: member.color,
    role: member.role,
    status: member.status,
    isSelf: member.id === user.id,
    manageable: isManageableMember(member, user.id),
  }),
})
