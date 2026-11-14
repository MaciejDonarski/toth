import { describe, expect, it, vi } from "vitest"

import type { Mailer } from "@/core/notifications/application/ports/mailer"

import { MailAuthNotifier } from "./mail-auth-notifier"
import { formatDuration, mailTranslator } from "./templates/auth-templates"

function setup() {
  const mailer: Mailer = { send: vi.fn().mockResolvedValue(undefined) }
  const notifier = new MailAuthNotifier(mailer, "https://app.example.com")
  const sent = () => vi.mocked(mailer.send).mock.calls[0]?.[0]
  return { notifier, sent }
}

describe("MailAuthNotifier", () => {
  it("sends the login code with its validity", async () => {
    const { notifier, sent } = setup()
    await notifier.sendLoginCode("a@b.pl", {
      code: "123456",
      validForMs: 180_000,
    })

    expect(sent()).toMatchObject({ to: "a@b.pl", subject: "Kod logowania" })
    expect(sent()?.text).toContain("123456")
    expect(sent()?.text).toContain("3 minuty")
    expect(sent()?.html).toContain('lang="pl"')
  })

  it("builds absolute, token-carrying links", async () => {
    const { notifier, sent } = setup()
    await notifier.sendPasswordReset("a@b.pl", {
      token: "t0k/en",
      validForMs: 1_800_000,
    })

    expect(sent()?.text).toContain(
      "https://app.example.com/reset-password?token=t0k%2Fen"
    )
    expect(sent()?.text).toContain("30 minut")
  })

  it("escapes dynamic values in HTML", async () => {
    const { notifier, sent } = setup()
    await notifier.sendInvitation("a@b.pl", {
      token: "t",
      companyName: "<script>alert(1)</script>",
      validForMs: 72 * 3_600_000,
    })

    expect(sent()?.html).not.toContain("<script>")
    expect(sent()?.html).toContain("&lt;script&gt;")
    expect(sent()?.text).toContain("3 dni")
  })
})

describe("formatDuration", () => {
  it.each([
    [60_000, "1 minuta"],
    [3 * 60_000, "3 minuty"],
    [5 * 60_000, "5 minut"],
    [22 * 60_000, "22 minuty"],
    [12 * 60_000, "12 minut"],
    [24 * 3_600_000, "24 godziny"],
    [30 * 24 * 3_600_000, "30 dni"],
  ])("%i ms → %s", (ms, expected) => {
    expect(formatDuration(mailTranslator("pl"), ms)).toBe(expected)
  })
})
