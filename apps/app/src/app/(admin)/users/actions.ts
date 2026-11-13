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

export type MemberActionResult = { error?: string }

/** Maps expected refusals to translated messages; rethrows everything else. */
async function toActionError(error: unknown): Promise<MemberActionResult> {
  const t = await getTranslations()
  if (error instanceof MemberChangeRefused) {
    return { error: t(`users.errors.${error.reason}`) }
  }
  if (isAuthError(error, "USER_LIMIT_REACHED")) {
    return { error: t("users.errors.USER_LIMIT_REACHED") }
  }
  if (isAuthError(error, "RATE_LIMITED")) {
    return { error: t("errors.rateLimited") }
  }
  throw error
}

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
    const { error: message } = await toActionError(error)
    return { formError: message }
  }
  revalidatePath("/users")
  return { sent: true }
}

export async function revokeInvitationAction(
  invitationId: string
): Promise<MemberActionResult> {
  const ctx = await requireTenantWith("users.invite")
  try {
    await companyUsers.revokeInvitation(
      ctx,
      invitationId,
      await getRequestMeta()
    )
  } catch (error) {
    return await toActionError(error)
  }
  revalidatePath("/users")
  return {}
}

export async function changeRoleAction(
  userId: string,
  role: Role
): Promise<MemberActionResult> {
  const ctx = await requireTenantWith("users.manage")
  try {
    await companyUsers.changeRole(ctx, userId, role, await getRequestMeta())
  } catch (error) {
    return await toActionError(error)
  }
  revalidatePath("/users")
  return {}
}

export async function setMemberActiveAction(
  userId: string,
  active: boolean
): Promise<MemberActionResult> {
  const ctx = await requireTenantWith("users.manage")
  try {
    await companyUsers.setActive(
      ctx,
      userId,
      active === true,
      await getRequestMeta()
    )
  } catch (error) {
    return await toActionError(error)
  }
  revalidatePath("/users")
  return {}
}
