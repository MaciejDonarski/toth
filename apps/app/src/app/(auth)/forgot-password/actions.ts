"use server"

import { getTranslations } from "next-intl/server"

import type { SubmitResult } from "@toth/form"

import { toFieldErrors } from "@/auth/form-errors"
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
      const t = await getTranslations("errors")
      return { formError: t("rateLimited") }
    }
    throw error
  }
  return { sent: true }
}
