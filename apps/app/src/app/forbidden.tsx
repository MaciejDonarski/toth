import type { Metadata } from "next"
import Link from "next/link"
import { ShieldAlertIcon } from "lucide-react"

import { Button } from "@toth/ui/components/button"

export const metadata: Metadata = { title: "Brak dostępu" }

/** Rendered (HTTP 403) when a page or action calls `forbidden()`. */
export default function Forbidden() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlertIcon
        aria-hidden="true"
        className="size-10 text-muted-foreground"
      />
      <h1 className="font-heading text-2xl font-bold">Brak dostępu</h1>
      <p className="max-w-sm text-sm text-balance text-muted-foreground">
        Twoja rola nie pozwala na otwarcie tej strony. Jeśli potrzebujesz
        dostępu, skontaktuj się z administratorem firmy.
      </p>
      <Button nativeButton={false} render={<Link href="/dashboard" />}>
        Wróć do pulpitu
      </Button>
    </main>
  )
}
