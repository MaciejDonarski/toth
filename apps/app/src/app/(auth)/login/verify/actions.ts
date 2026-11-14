"use server"

import { getTranslations } from "next-intl/server"

import { completeSignIn } from "@/auth/complete-sign-in"
import {
  clearLoginChallengeCookie,
  getLoginChallengeCookie,
  setTrustedDeviceCookie,
} from "@/auth/cookies"
import { getRequestMeta } from "@/auth/request-meta"
import { resendLoginCode, verifyLoginCode } from "@/composition-root"
import {
  loginCodeSchema,
  type LoginCodeInput,
} from "@/core/auth/application/schemas"
import { AUTH_POLICY } from "@/core/auth/domain/auth-policy"
import { isAuthError } from "@/core/auth/domain/errors"

export type VerifyCodeResult = {
  error: string
  /** The challenge is gone: the user has to sign in again. */
  restart?: boolean
  /** The code expired: offer a resend. */
  expired?: boolean
}

export async function verifyCodeAction(
  input: LoginCodeInput,
  callbackUrl?: string
): Promise<VerifyCodeResult> {
  const t = await getTranslations()
  const parsed = loginCodeSchema.safeParse(input)
  if (!parsed.success) return { error: t("validation.code.format") }

  const challengeToken = await getLoginChallengeCookie()
  let result
  try {
    result = await verifyLoginCode(
      challengeToken,
      parsed.data,
      await getRequestMeta()
    )
  } catch (error) {
    if (isAuthError(error, "CODE_INVALID")) {
      const left = Number(error.detail?.attemptsLeft ?? 0)
      return { error: t("auth.verify.errors.invalidCode", { count: left }) }
    }
    if (isAuthError(error, "CODE_EXPIRED")) {
      return { error: t("auth.verify.errors.codeExpired"), expired: true }
    }
    if (isAuthError(error, "CHALLENGE_INVALID")) {
      await clearLoginChallengeCookie()
      return { error: t("auth.verify.errors.restart"), restart: true }
    }
    throw error
  }

  if (result.trustedDeviceToken) {
    await setTrustedDeviceCookie(
      result.trustedDeviceToken,
      AUTH_POLICY.trustedDeviceTtlMs
    )
  }
  await clearLoginChallengeCookie()
  const failure = await completeSignIn(result.grant, callbackUrl)
  return { error: failure.formError, restart: true }
}

export type ResendCodeResult =
  | {
      ok: true
      codeExpiresAt: number
      nextResendAt: number
      resendsLeft: number
    }
  | { ok: false; error: string; restart?: boolean; retryAt?: number }

export async function resendCodeAction(): Promise<ResendCodeResult> {
  const t = await getTranslations("auth.verify.errors")
  try {
    const result = await resendLoginCode(await getLoginChallengeCookie())
    return {
      ok: true,
      codeExpiresAt: result.codeExpiresAt.getTime(),
      nextResendAt: result.nextResendAt.getTime(),
      resendsLeft: result.resendsLeft,
    }
  } catch (error) {
    if (isAuthError(error, "RESEND_TOO_SOON")) {
      const retryAt = error.detail?.retryAt
      return {
        ok: false,
        error: t("resendTooSoon"),
        retryAt: retryAt instanceof Date ? retryAt.getTime() : undefined,
      }
    }
    if (isAuthError(error, "RESEND_LIMIT_REACHED")) {
      return {
        ok: false,
        error: t("resendLimit"),
        restart: true,
      }
    }
    if (isAuthError(error, "CHALLENGE_INVALID")) {
      await clearLoginChallengeCookie()
      return { ok: false, error: t("restart"), restart: true }
    }
    throw error
  }
}
