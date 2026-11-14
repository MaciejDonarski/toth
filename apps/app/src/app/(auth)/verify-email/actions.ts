"use server"

import { redirect } from "next/navigation"

import { clearPendingEmail } from "@/auth/cookies"
import { getRequestMeta } from "@/auth/request-meta"
import { verifyEmail } from "@/composition-root"
import { isAuthError } from "@/core/auth/domain/errors"

export type VerifyEmailState = { status: "idle" | "invalid" }

/**
 * Confirms the email only on an explicit POST (button click), so link
 * scanners in mail clients that prefetch GET URLs cannot consume the token.
 */
export async function verifyEmailAction(
  _previous: VerifyEmailState,
  formData: FormData
): Promise<VerifyEmailState> {
  const token = formData.get("token")
  try {
    await verifyEmail(
      typeof token === "string" ? token : "",
      await getRequestMeta()
    )
  } catch (error) {
    if (isAuthError(error, "TOKEN_INVALID")) return { status: "invalid" }
    throw error
  }

  await clearPendingEmail()
  redirect("/login?verified=1")
}
