"use server"

import type { SubmitResult } from "@toth/form"

import { RATE_LIMITED_ERROR, toFieldErrors } from "@/auth/form-errors"
import { getRequestMeta } from "@/auth/request-meta"
import { requestPasswordReset } from "@/composition-root"
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/core/auth/application/schemas"
import { isAuthError } from "@/core/auth/domain/errors"

export type ForgotPasswordResult = SubmitResult<ForgotPasswordInput> & {
  /** The request was accepted (whether or not the account exists). */
  sent?: boolean
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) }

  try {
    await requestPasswordReset(parsed.data.email, await getRequestMeta())
  } catch (error) {
    if (isAuthError(error, "RATE_LIMITED")) {
      return { formError: RATE_LIMITED_ERROR }
    }
    throw error
  }
  return { sent: true }
}
