import { Badge } from "@toth/ui/components/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@toth/ui/components/card"

import { getGreeting } from "@/composition-root"

export default async function Page() {
  const greeting = await getGreeting()

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
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
    </main>
  )
}
