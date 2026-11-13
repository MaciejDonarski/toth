import type { Metadata } from "next"

import { AUTH_POLICY } from "@/core/auth/domain/auth-policy"
import { AuthHeading } from "@/ui/auth/auth-heading"

export const metadata: Metadata = { title: "Regulamin" }

// TODO: replace with the real terms of service. Bump AUTH_POLICY.termsVersion
// whenever the content changes.
export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <AuthHeading
        title="Regulamin"
        description={`Wersja ${AUTH_POLICY.termsVersion}`}
      />
      <p className="text-sm text-muted-foreground">
        Treść regulaminu zostanie uzupełniona.
      </p>
    </div>
  )
}
