import type { Metadata } from "next"

import { LoginForm } from "@/ui/auth/login-form"

export const metadata: Metadata = { title: "Login" }

export default function Page() {
  return <LoginForm />
}
