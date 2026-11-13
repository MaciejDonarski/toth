import type { Metadata } from "next"

import { requirePermission } from "@/auth/dal"

export const metadata: Metadata = { title: "Użytkownicy" }

export default async function Page() {
  await requirePermission("users.view")

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold">Użytkownicy</h1>
      <div className="min-h-64 flex-1 rounded-xl bg-muted/50" />
    </div>
  )
}
