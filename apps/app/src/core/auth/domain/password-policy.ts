/**
 * Domain: password rules. Shared by the zod schemas (client + server) and the
 * live checklist shown under the password field.
 */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export type PasswordRuleId =
  "minLength" | "maxLength" | "lowercase" | "uppercase" | "digit" | "special"

export type PasswordRule = Readonly<{
  id: PasswordRuleId
  label: string
  test: (password: string) => boolean
}>

export const PASSWORD_RULES: readonly PasswordRule[] = Object.freeze([
  {
    id: "minLength",
    label: `Co najmniej ${PASSWORD_MIN_LENGTH} znaków`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "maxLength",
    label: `Najwyżej ${PASSWORD_MAX_LENGTH} znaków`,
    test: (p) => p.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: "lowercase",
    label: "Mała litera",
    test: (p) => /\p{Ll}/u.test(p),
  },
  {
    id: "uppercase",
    label: "Wielka litera",
    test: (p) => /\p{Lu}/u.test(p),
  },
  { id: "digit", label: "Cyfra", test: (p) => /\d/.test(p) },
  {
    id: "special",
    label: "Znak specjalny",
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
