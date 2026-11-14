"use client"

import { useEffect, useRef } from "react"

import { toast } from "@toth/ui/components/toast"

/** Shows the success messages of redirects to /login (?verified=1, …) as toasts. */
export function LoginNotices({ messages }: { messages: readonly string[] }) {
  const shownRef = useRef(false)

  useEffect(() => {
    // Strict Mode runs effects twice in dev; show the toasts once.
    if (shownRef.current) return
    shownRef.current = true
    for (const title of messages) toast.add({ type: "success", title })
  }, [messages])

  return null
}
