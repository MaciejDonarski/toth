"use server"

import { revalidatePath } from "next/cache"

import type { SubmitResult } from "@toth/form"

import { requireTenantWith } from "@/auth/dal"
import { RATE_LIMITED_ERROR, toFieldErrors } from "@/auth/form-errors"
import { getRequestMeta } from "@/auth/request-meta"
import { companyUsers } from "@/composition-root"
import { isAuthError } from "@/core/auth/domain/errors"
import type { Role } from "@/core/auth/domain/role"
import { MemberChangeRefused } from "@/core/users/application/company-users"
import {
  inviteUserSchema,
  type InviteUserInput,
} from "@/core/users/application/schemas"
import type { MemberChangeError } from "@/core/users/domain/membership"

const CHANGE_ERRORS: Record<MemberChangeError, string> = {
  SELF_CHANGE: "Nie możesz zmienić roli ani wyłączyć własnego konta.",
  LAST_ADMIN: "Firma musi mieć co najmniej jednego aktywnego administratora.",
  NOT_FOUND: "Nie znaleziono użytkownika lub zaproszenia.",
  USER_LIMIT_REACHED: "Osiągnięto limit użytkowników firmy.",
}

export type MemberActionResult = { error?: string }

/** Maps expected refusals to messages; rethrows everything else. */
function toActionError(error: unknown): MemberActionResult {
  if (error instanceof MemberChangeRefused) {
    return { error: CHANGE_ERRORS[error.reason] }
  }
  if (isAuthError(error, "USER_LIMIT_REACHED")) {
    return { error: CHANGE_ERRORS.USER_LIMIT_REACHED }
  }
  if (isAuthError(error, "RATE_LIMITED")) return { error: RATE_LIMITED_ERROR }
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
      return { fieldErrors: { email: "Ten adres ma już konto w systemie." } }
    }
    const { error: message } = toActionError(error)
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
    return toActionError(error)
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
    return toActionError(error)
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
    return toActionError(error)
  }
  revalidatePath("/users")
  return {}
}
