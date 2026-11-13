"use server"

import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import type { SubmitResult } from "@toth/form"

import {
  getTrustedDeviceCookie,
  setLoginChallengeCookie,
  setPendingEmail,
} from "@/auth/cookies"
import { completeSignIn } from "@/auth/complete-sign-in"
import { toFieldErrors } from "@/auth/form-errors"
import { getRequestMeta } from "@/auth/request-meta"
import { safeRedirectPath } from "@/auth/safe-redirect"
import { startLogin } from "@/composition-root"
import { loginSchema, type LoginInput } from "@/core/auth/application/schemas"
import { AUTH_POLICY } from "@/core/auth/domain/auth-policy"
import { isAuthError } from "@/core/auth/domain/errors"

export type LoginActionResult = SubmitResult<LoginInput> & {
  /** Correct password, but the email is not confirmed yet. */
  unverified?: boolean
}

export async function loginAction(
  input: LoginInput,
  callbackUrl?: string
): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) }

  let result
  try {
    result = await startLogin(
      parsed.data,
      await getRequestMeta(),
      await getTrustedDeviceCookie()
    )
  } catch (error) {
    const t = await getTranslations()
    if (isAuthError(error, "INVALID_CREDENTIALS")) {
      return { formError: t("auth.login.errors.invalidCredentials") }
    }
    if (isAuthError(error, "ACCOUNT_LOCKED")) {
      const retryAt = error.detail?.retryAt
      const minutes =
        retryAt instanceof Date
          ? Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 60_000))
          : Math.ceil(AUTH_POLICY.loginLockoutMs / 60_000)
      return { formError: t("auth.login.errors.locked", { minutes }) }
    }
    if (isAuthError(error, "EMAIL_NOT_VERIFIED")) {
      await setPendingEmail(parsed.data.email)
      return {
        formError: t("auth.login.errors.unverified"),
        unverified: true,
      }
    }
    if (isAuthError(error, "RATE_LIMITED")) {
      return { formError: t("errors.rateLimited") }
    }
    throw error
  }

  if (result.kind === "granted") {
    return completeSignIn(result.grant, callbackUrl)
  }

  await setLoginChallengeCookie(
    result.challengeToken,
    AUTH_POLICY.loginChallengeTtlMs
  )
  const target = safeRedirectPath(callbackUrl)
  redirect(`/login/verify?callbackUrl=${encodeURIComponent(target)}`)
}
