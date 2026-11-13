/**
 * Domain: password rules. Shared by the zod schemas (client + server) and the
 * live checklist shown under the password field (labels: `passwordRules.<id>`).
 */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export type PasswordRuleId =
  "minLength" | "maxLength" | "lowercase" | "uppercase" | "digit" | "special"

export type PasswordRule = Readonly<{
  /** Also the message key: `passwordRules.<id>`. */
  id: PasswordRuleId
  /** Values for the message, e.g. `{ min: 8 }`. */
  params?: Readonly<Record<string, number>>
  test: (password: string) => boolean
}>

export const PASSWORD_RULES: readonly PasswordRule[] = Object.freeze<
  PasswordRule[]
>([
  {
    id: "minLength",
    params: { min: PASSWORD_MIN_LENGTH },
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "maxLength",
    params: { max: PASSWORD_MAX_LENGTH },
    test: (p) => p.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: "lowercase",
    test: (p) => /\p{Ll}/u.test(p),
  },
  {
    id: "uppercase",
    test: (p) => /\p{Lu}/u.test(p),
  },
  { id: "digit", test: (p) => /\d/.test(p) },
  {
    id: "special",
    test: (p) => /[^\p{L}\d\s]/u.test(p),
  },
])

export function failedPasswordRules(password: string): PasswordRuleId[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map(
    (rule) => rule.id
  )
}

export function isPasswordValid(password: string): boolean {
  return failedPasswordRules(password).length === 0
}
