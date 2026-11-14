import { translatedMetadata } from "@/i18n/metadata"

import { ForgotPasswordForm } from "@/ui/auth/forgot-password-form"

import { forgotPasswordAction } from "./actions"

export const generateMetadata = translatedMetadata("forgotPassword")

export default function Page() {
  return <ForgotPasswordForm onRequest={forgotPasswordAction} />
}
