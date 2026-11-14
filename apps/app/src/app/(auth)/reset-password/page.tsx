import { translatedMetadata } from "@/i18n/metadata"

import { checkPasswordResetToken } from "@/composition-root"
import type { ResetPasswordInput } from "@/core/auth/application/schemas"
import {
  InvalidResetLink,
  ResetPasswordForm,
} from "@/ui/auth/reset-password-form"

import { resetPasswordAction } from "./actions"

export const generateMetadata = translatedMetadata("resetPassword", {
  // Keep the token out of Referer headers sent to other origins.
  referrer: "no-referrer",
})

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token } = await searchParams
  const value = typeof token === "string" ? token : ""

  // Checked without consuming; the action validates again atomically.
  if (!(await checkPasswordResetToken(value))) return <InvalidResetLink />

  async function reset(input: ResetPasswordInput) {
    "use server"
    return resetPasswordAction(value, input)
  }

  return <ResetPasswordForm onReset={reset} />
}
