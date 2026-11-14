"use server"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"

import type { SubmitResult } from "@toth/form"

import { clearTrustedDeviceCookie } from "@/auth/cookies"
import { getSessionId, requireTenantWith } from "@/auth/dal"
import { toFieldErrors } from "@/auth/form-errors"
import { getRequestMeta } from "@/auth/request-meta"
import { profile } from "@/composition-root"
import { isAuthError } from "@/core/auth/domain/errors"
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordInput,
  type ProfileInput,
} from "@/core/users/application/schemas"

export type ProfileActionResult = SubmitResult<ProfileInput> & {
  saved?: boolean
}

export async function updateProfileAction(
  input: ProfileInput
): Promise<ProfileActionResult> {
  const ctx = await requireTenantWith("profile.edit-own")
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) }

  await profile.update(ctx, input, await getRequestMeta())
  // Name and phone show up in the shell and on the users list.
  revalidatePath("/", "layout")
  return { saved: true }
}

export type ChangePasswordActionResult = SubmitResult<ChangePasswordInput> & {
  changed?: boolean
}

export async function changePasswordAction(
  input: ChangePasswordInput
): Promise<ChangePasswordActionResult> {
  const ctx = await requireTenantWith("profile.edit-own")
  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) }

  try {
    await profile.changePassword(
      ctx,
      await getSessionId(),
      parsed.data,
      await getRequestMeta()
    )
  } catch (error) {
    if (isAuthError(error, "INVALID_CREDENTIALS")) {
      // A message key; the form translates field errors.
      return {
        fieldErrors: { currentPassword: "validation.password.currentInvalid" },
      }
    }
    if (isAuthError(error, "RATE_LIMITED")) {
      const t = await getTranslations("errors")
      return { formError: t("rateLimited") }
    }
    throw error
  }

  // Trusted browsers were revoked server-side; forget this one locally too.
  await clearTrustedDeviceCookie()
  return { changed: true }
}
