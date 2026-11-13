import type { Metadata } from "next"

export const metadata: Metadata = { title: "Settings" }

export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold">Settings</h1>
      <div className="min-h-64 flex-1 rounded-xl bg-muted/50" />
    </div>
  )
}
