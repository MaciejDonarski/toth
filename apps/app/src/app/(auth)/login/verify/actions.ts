"use server"

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

const RESTART =
  "Logowanie wygasło lub wykorzystano limit prób. Zaloguj się ponownie."

export async function verifyCodeAction(
  input: LoginCodeInput,
  callbackUrl?: string
): Promise<VerifyCodeResult> {
  const parsed = loginCodeSchema.safeParse(input)
  if (!parsed.success) return { error: "Kod składa się z 6 cyfr." }

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
      return {
        error: `Nieprawidłowy kod. Pozostało prób: ${left}.`,
      }
    }
    if (isAuthError(error, "CODE_EXPIRED")) {
      return { error: "Kod wygasł. Wyślij nowy kod.", expired: true }
    }
    if (isAuthError(error, "CHALLENGE_INVALID")) {
      await clearLoginChallengeCookie()
      return { error: RESTART, restart: true }
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
        error: "Odczekaj chwilę przed ponowną wysyłką.",
        retryAt: retryAt instanceof Date ? retryAt.getTime() : undefined,
      }
    }
    if (isAuthError(error, "RESEND_LIMIT_REACHED")) {
      return {
        ok: false,
        error: "Wykorzystano limit ponownych wysyłek. Zaloguj się ponownie.",
        restart: true,
      }
    }
    if (isAuthError(error, "CHALLENGE_INVALID")) {
      await clearLoginChallengeCookie()
      return { ok: false, error: RESTART, restart: true }
    }
    throw error
  }
}
