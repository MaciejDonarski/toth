"use server"

import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import type { SubmitResult } from "@toth/form"

import { toFieldErrors } from "@/auth/form-errors"
import { getRequestMeta } from "@/auth/request-meta"
import { invitationAcceptance } from "@/composition-root"
import { isAuthError } from "@/core/auth/domain/errors"
import {
  acceptInvitationSchema,
  type AcceptInvitationInput,
} from "@/core/users/application/schemas"

export type AcceptInvitationResult = SubmitResult<AcceptInvitationInput> & {
  invalid?: boolean
}

export async function acceptInvitationAction(
  token: string,
  input: AcceptInvitationInput
): Promise<AcceptInvitationResult> {
  const parsed = acceptInvitationSchema.safeParse(input)
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) }

  try {
    await invitationAcceptance.accept(
      token,
      parsed.data,
      await getRequestMeta()
    )
  } catch (error) {
    const t = await getTranslations("acceptInvite.errors")
    if (isAuthError(error, "TOKEN_INVALID")) {
      return { formError: t("invalid"), invalid: true }
    }
    if (isAuthError(error, "USER_LIMIT_REACHED")) {
      return { formError: t("limit") }
    }
    if (isAuthError(error, "EMAIL_TAKEN")) {
      return { formError: t("emailTaken") }
    }
    throw error
  }
  redirect("/login?invited=1")
}
