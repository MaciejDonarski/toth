import { translatedMetadata } from "@/i18n/metadata"

import { RegisterForm } from "@/ui/auth/register-form"

import { registerAction } from "./actions"

export const generateMetadata = translatedMetadata("register")

export default function Page() {
  return <RegisterForm onRegister={registerAction} />
}
