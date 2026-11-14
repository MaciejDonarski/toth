"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"

import type { SubmitResult } from "@toth/form"

import { requireTenantWith } from "@/auth/dal"
import { toFieldErrors } from "@/auth/form-errors"
import { getRequestMeta } from "@/auth/request-meta"
import { companyUsers } from "@/composition-root"
import { isAuthError } from "@/core/auth/domain/errors"
import type { Role } from "@/core/auth/domain/role"
import { MemberChangeRefused } from "@/core/users/application/company-users"
import {
  inviteUserSchema,
  type InviteUserInput,
} from "@/core/users/application/schemas"
import type { RowActionResult } from "@/ui/data-table/row-actions"

import { runRowAction, type RowActionErrorMapper } from "../_lib/row-action"

/** Expected refusals of member/invitation changes → translated messages. */
const mapError: RowActionErrorMapper = (error, t) => {
  if (error instanceof MemberChangeRefused) {
    return t(`users.errors.${error.reason}`)
  }
  if (isAuthError(error, "USER_LIMIT_REACHED")) {
    return t("users.errors.USER_LIMIT_REACHED")
  }
  return null
}

const options = { mapError, revalidate: "/users" }

export type InviteActionResult = SubmitResult<InviteUserInput> & {
  sent?: boolean
}

export async function inviteUserAction(
  input: InviteUserInput
): Promise<InviteActionResult> {
  const ctx = await requireTenantWith("users.invite")
  const parsed = inviteUserSchema.safeParse(input)
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) }

  try {
    await companyUsers.invite(ctx, parsed.data, await getRequestMeta())
  } catch (error) {
    if (isAuthError(error, "EMAIL_TAKEN")) {
      // A message key; the form translates field errors.
      return { fieldErrors: { email: "users.errors.EMAIL_TAKEN" } }
    }
    const t = await getTranslations()
    const message =
      mapError(error, t) ??
      (isAuthError(error, "RATE_LIMITED") ? t("errors.rateLimited") : null)
    if (message === null) throw error
    return { formError: message }
  }
  revalidatePath("/users")
  return { sent: true }
}

export async function revokeInvitationAction(
  invitationId: string
): Promise<RowActionResult> {
  return runRowAction(
    "users.invite",
    (ctx, meta) => companyUsers.revokeInvitation(ctx, invitationId, meta),
    options
  )
}

export async function changeRoleAction(
  userId: string,
  role: Role
): Promise<RowActionResult> {
  return runRowAction(
    "users.manage",
    (ctx, meta) => companyUsers.changeRole(ctx, userId, role, meta),
    options
  )
}

export async function setMemberActiveAction(
  userId: string,
  active: boolean
): Promise<RowActionResult> {
  return runRowAction(
    "users.manage",
    (ctx, meta) => companyUsers.setActive(ctx, userId, active === true, meta),
    options
  )
}

export async function deleteMemberAction(
  userId: string
): Promise<RowActionResult> {
  return runRowAction(
    "users.manage",
    (ctx, meta) => companyUsers.remove(ctx, userId, meta),
    options
  )
}
