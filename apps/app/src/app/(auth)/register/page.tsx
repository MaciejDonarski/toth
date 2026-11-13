import type { Metadata } from "next"

import { RegisterForm } from "@/ui/auth/register-form"

import { registerAction } from "./actions"

export const metadata: Metadata = { title: "Rejestracja" }

export default function Page() {
  return <RegisterForm onRegister={registerAction} />
}
