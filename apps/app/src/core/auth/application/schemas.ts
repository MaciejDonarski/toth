import { z } from "zod"

import { failedPasswordRules } from "../domain/password-policy"

/**
 * Input schemas shared by the client forms and the server (actions and use
 * cases re-validate — never trust the client).
 *
 * Messages are KEYS into the message catalog (src/i18n/messages), never
 * user-facing text; forms and actions translate them.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "validation.email.required")
  .max(254, "validation.email.tooLong")
  .pipe(z.email("validation.email.invalid"))

export const newPasswordSchema = z.string().superRefine((password, ctx) => {
  if (failedPasswordRules(password).length > 0) {
    ctx.addIssue({ code: "custom", message: "validation.password.weak" })
  }
})

/** A person's full name, as one field ("Jan Kowalski"). */
export const personNameSchema = z
  .string()
  .trim()
  .min(2, "validation.name.tooShort")
  .max(100, "validation.name.tooLong")

const registerFields = z.object({
  name: personNameSchema,
  companyName: z
    .string()
    .trim()
    .min(2, "validation.companyName.tooShort")
    .max(120, "validation.companyName.tooLong"),
  email: emailSchema,
  password: newPasswordSchema,
  confirmPassword: z.string().min(1, "validation.password.confirmRequired"),
  acceptTerms: z
    .boolean()
    .refine((accepted) => accepted, "validation.terms.required"),
})

const passwordPair = registerFields.pick({
  password: true,
  confirmPassword: true,
})

export const registerSchema = registerFields.refine(
  (data) => data.password === data.confirmPassword,
  {
    path: ["confirmPassword"],
    message: "validation.password.mismatch",
    // Compare as soon as both password fields are valid, even if other
    // fields still have errors.
    when: (payload) => passwordPair.safeParse(payload.value).success,
  }
)

export type RegisterInput = z.input<typeof registerSchema>
export type RegisterData = z.output<typeof registerSchema>

export const resendVerificationSchema = z.object({ email: emailSchema })

export const forgotPasswordSchema = z.object({ email: emailSchema })

export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>

const newPasswordFields = z.object({
  password: newPasswordSchema,
  confirmPassword: z.string().min(1, "validation.password.confirmRequired"),
})

export const resetPasswordSchema = newPasswordFields.refine(
  (data) => data.password === data.confirmPassword,
  { path: ["confirmPassword"], message: "validation.password.mismatch" }
)

export type ResetPasswordInput = z.input<typeof resetPasswordSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "validation.password.required")
    .max(128, "validation.password.tooLong"),
})

export type LoginInput = z.input<typeof loginSchema>

export const loginCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "validation.code.format"),
  remember: z.boolean(),
})

export type LoginCodeInput = z.input<typeof loginCodeSchema>
