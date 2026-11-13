import type { Metadata } from "next"

import { Badge } from "@toth/ui/components/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@toth/ui/components/card"

import { requireUser } from "@/auth/dal"
import { getGreeting } from "@/composition-root"

export const metadata: Metadata = { title: "Dashboard" }

export default async function Page() {
  await requireUser()
  const greeting = await getGreeting()

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            @toth/app
          </Badge>
          <CardTitle className="font-heading text-2xl">
            {greeting.message}
          </CardTitle>
          <CardDescription>
            Next.js + hexagonal architecture, styled with @toth/ui.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
