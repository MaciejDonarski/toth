import type { Role } from "@/core/auth/domain/role"

export type OpenInvitation = Readonly<{
  email: string
  role: Role
  companyName: string
  expiresAt: Date
}>

export type AcceptInvitationResult =
  | { ok: true; userId: string; companyId: string; email: string }
  | { ok: false; error: "TOKEN_INVALID" | "USER_LIMIT_REACHED" | "EMAIL_TAKEN" }

/**
 * Invitation acceptance runs before the invitee has an account, so it is
 * keyed by the secret token (hash) rather than a tenant context. The token
 * determines the company; nothing from the request can choose another.
 */
export interface InvitationAcceptanceStore {
  findOpen(tokenHash: string, now: Date): Promise<OpenInvitation | null>

  /**
   * In one transaction, under a lock on the company row: consume the
   * invitation, re-check the seat limit, create the verified user with the
   * invited role in the invitation's company.
   */
  accept(input: {
    tokenHash: string
    name: string
    passwordHash: string
    termsVersion: string
    now: Date
  }): Promise<AcceptInvitationResult>
}
