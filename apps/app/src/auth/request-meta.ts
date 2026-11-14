import "server-only"

import { headers } from "next/headers"

import type { RequestMeta } from "@/core/auth/application/request-meta"

/**
 * Client IP and user agent of the current request. On Vercel the first
 * `x-forwarded-for` entry is set by the platform and cannot be spoofed.
 */
export async function getRequestMeta(): Promise<RequestMeta> {
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || h.get("x-real-ip") || undefined
  const userAgent = h.get("user-agent")?.slice(0, 512) || undefined
  return { ip, userAgent }
}
