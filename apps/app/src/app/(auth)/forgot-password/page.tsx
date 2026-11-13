import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/ui/auth/forgot-password-form"

import { forgotPasswordAction } from "./actions"

export const metadata: Metadata = { title: "Reset hasła" }

export default function Page() {
  return <ForgotPasswordForm onRequest={forgotPasswordAction} />
}
