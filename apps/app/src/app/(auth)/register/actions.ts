"use server"

import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import type { SubmitResult } from "@toth/form"

import { getPendingEmail, setPendingEmail } from "@/auth/cookies"
import { toFieldErrors } from "@/auth/form-errors"
import { getRequestMeta } from "@/auth/request-meta"
import { registerCompany, resendVerification } from "@/composition-root"
import {
  registerSchema,
  resendVerificationSchema,
  type RegisterInput,
} from "@/core/auth/application/schemas"
import { isAuthError } from "@/core/auth/domain/errors"

export async function registerAction(
  input: RegisterInput
): Promise<SubmitResult<RegisterInput>> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) }
  }

  try {
    await registerCompany(parsed.data, await getRequestMeta())
  } catch (error) {
    if (isAuthError(error, "RATE_LIMITED")) {
      const t = await getTranslations("errors")
      return { formError: t("rateLimited") }
    }
    throw error
  }

  // Same outcome for new and already registered emails (no enumeration).
  await setPendingEmail(parsed.data.email)
  redirect("/register/check-email")
}

export type ResendVerificationResult =
  { ok: true } | { ok: false; error: string }

/**
 * Sends a new verification link to `email`, or to the address remembered
 * from registration when omitted. Always reports success for valid input.
 */
export async function resendVerificationAction(
  email?: string
): Promise<ResendVerificationResult> {
  const t = await getTranslations()
  const target = email ?? (await getPendingEmail())
  const parsed = resendVerificationSchema.safeParse({ email: target ?? "" })
  if (!parsed.success) {
    return { ok: false, error: t("auth.checkEmail.invalidEmail") }
  }

  try {
    await resendVerification(parsed.data.email, await getRequestMeta())
  } catch (error) {
    if (isAuthError(error, "RATE_LIMITED")) {
      return { ok: false, error: t("errors.rateLimited") }
    }
    throw error
  }
  return { ok: true }
}
