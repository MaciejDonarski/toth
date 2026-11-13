export type AuthEventType =
  | "register"
  | "email_verified"
  | "login_failed"
  | "login_locked"
  | "login_code_sent"
  | "login_code_failed"
  | "login_success"
  | "logout"
  | "session_revoked"
  | "trusted_device_added"
  | "password_reset_requested"
  | "password_reset"
  | "invitation_sent"
  | "invitation_accepted"
  | "invitation_revoked"
  | "member_role_changed"
  | "member_disabled"
  | "member_enabled"

export type AuthEvent = Readonly<{
  type: AuthEventType
  userId?: string
  companyId?: string
  ip?: string
  userAgent?: string
  meta?: Readonly<Record<string, unknown>>
}>

export interface AuthEventLog {
  record(event: AuthEvent): Promise<void>
}
