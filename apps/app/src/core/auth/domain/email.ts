/**
 * Domain: emails are compared and stored in one canonical form.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** `jan.kowalski@firma.pl` → `j***@firma.pl` (for "we sent a code to …"). */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = normalizeEmail(email).split("@")
  if (!domain) return "***"
  return `${local.slice(0, 1)}***@${domain}`
}
