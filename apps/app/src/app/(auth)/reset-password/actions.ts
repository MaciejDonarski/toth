"use server"

import { redirect } from "next/navigation"

import type { SubmitResult } from "@toth/form"

import {
  clearLoginChallengeCookie,
  clearTrustedDeviceCookie,
} from "@/auth/cookies"
import { toFieldErrors } from "@/auth/form-errors"
import { getRequestMeta } from "@/auth/request-meta"
import { resetPassword } from "@/composition-root"
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/core/auth/application/schemas"
import { isAuthError } from "@/core/auth/domain/errors"

export type ResetPasswordResult = SubmitResult<ResetPasswordInput> & {
  /** The link is no longer usable: show "request a new link". */
  invalidToken?: boolean
}

export async function resetPasswordAction(
  token: string,
  input: ResetPasswordInput
): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) }

  try {
    await resetPassword(token, parsed.data, await getRequestMeta())
  } catch (error) {
    if (isAuthError(error, "TOKEN_INVALID")) {
      return {
        formError: "Link wygasł lub został już użyty.",
        invalidToken: true,
      }
    }
    throw error
  }

  // Server-side the trusted devices are revoked; drop this browser's cookies too.
  await Promise.all([clearTrustedDeviceCookie(), clearLoginChallengeCookie()])
  redirect("/login?reset=1")
}
