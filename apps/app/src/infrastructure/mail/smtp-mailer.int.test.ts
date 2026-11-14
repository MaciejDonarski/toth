import { randomUUID } from "node:crypto"

import { describe, expect, it } from "vitest"

import { MailAuthNotifier } from "./mail-auth-notifier"
import { SmtpMailer } from "./smtp-mailer"

const MAILPIT_API =
  process.env.TEST_MAILPIT_API ?? "http://localhost:8026/api/v1"

describe("SmtpMailer → Mailpit", () => {
  it("delivers a Polish login-code email", async () => {
    const to = `it-${randomUUID()}@example.com`
    const mailer = new SmtpMailer({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1026),
      from: "Toth <no-reply@localhost>",
    })
    await new MailAuthNotifier(mailer, "http://localhost:3000").sendLoginCode(
      to,
      {
        code: "424242",
        validForMs: 180_000,
      }
    )

    const res = await fetch(
      `${MAILPIT_API}/search?query=${encodeURIComponent(`to:${to}`)}`
    )
    const body = (await res.json()) as {
      messages: { Subject: string; Snippet: string }[]
    }

    expect(body.messages).toHaveLength(1)
    expect(body.messages[0]?.Subject).toBe("Kod logowania")
    expect(body.messages[0]?.Snippet).toContain("424242")
  })
})
