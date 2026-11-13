"use server"

import { redirect } from "next/navigation"

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
    if (isAuthError(error, "TOKEN_INVALID")) {
      return { formError: "Zaproszenie jest nieważne.", invalid: true }
    }
    if (isAuthError(error, "USER_LIMIT_REACHED")) {
      return {
        formError:
          "Firma wykorzystała limit użytkowników. Skontaktuj się z administratorem.",
      }
    }
    if (isAuthError(error, "EMAIL_TAKEN")) {
      return {
        formError: "Ten adres ma już konto. Zaloguj się albo zresetuj hasło.",
      }
    }
    throw error
  }
  redirect("/login?invited=1")
}
