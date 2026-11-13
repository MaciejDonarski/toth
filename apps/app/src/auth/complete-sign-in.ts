import "server-only"

import { AuthError as NextAuthError } from "next-auth"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { signIn } from "./next-auth"
import { safeRedirectPath } from "./safe-redirect"

/**
 * Hands a single-use grant to Auth.js, which redeems it (creating the DB
 * session) and sets the session cookie, then redirects to a safe target.
 *
 * Deliberately NOT a server action: exports of "use server" files are public
 * endpoints. Call it only from actions that produced the grant.
 */
export async function completeSignIn(
  grant: string,
  callbackUrl?: string
): Promise<{ formError: string }> {
  try {
    await signIn("login-grant", { grant, redirect: false })
  } catch (error) {
    if (error instanceof NextAuthError) {
      const t = await getTranslations("auth.login.errors")
      return { formError: t("signInFailed") }
    }
    throw error
  }
  redirect(safeRedirectPath(callbackUrl))
}
