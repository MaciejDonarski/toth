import "server-only"

import { z } from "zod"

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must be at least 32 characters"),
    /** Public base URL used in email links. Falls back to AUTH_URL / Vercel URL. */
    APP_URL: z.url().optional(),
    AUTH_URL: z.url().optional(),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
    MAIL_TRANSPORT: z.enum(["smtp", "resend"]).default("smtp"),
    MAIL_FROM: z.string().min(1),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1026),
    RESEND_API_KEY: z.string().optional(),
  })
  .refine((env) => env.MAIL_TRANSPORT !== "resend" || !!env.RESEND_API_KEY, {
    message: "RESEND_API_KEY is required when MAIL_TRANSPORT=resend",
    path: ["RESEND_API_KEY"],
  })

export type ServerEnv = z.infer<typeof serverEnvSchema> & { appUrl: string }

let cached: ServerEnv | undefined

/** Validated on first use, so tests that never touch auth need no env. */
export function getServerEnv(): ServerEnv {
  if (cached) return cached
  const parsed = serverEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment:\n${z.prettifyError(parsed.error)}`
    )
  }
  const env = parsed.data
  const appUrl =
    env.APP_URL ??
    env.AUTH_URL ??
    (env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined)
  if (!appUrl) {
    throw new Error("Set APP_URL (or AUTH_URL) so email links can be built")
  }
  cached = { ...env, appUrl }
  return cached
}
