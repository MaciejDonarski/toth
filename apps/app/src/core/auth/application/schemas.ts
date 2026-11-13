import { z } from "zod"

import { failedPasswordRules } from "../domain/password-policy"

/**
 * Input schemas shared by the client forms and the server (actions and use
 * cases re-validate — never trust the client).
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Podaj adres email")
  .max(254, "Adres email jest za długi")
  .pipe(z.email("Nieprawidłowy adres email"))

export const newPasswordSchema = z.string().superRefine((password, ctx) => {
  if (failedPasswordRules(password).length > 0) {
    ctx.addIssue({ code: "custom", message: "Hasło nie spełnia wymagań" })
  }
})

const registerFields = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Podaj nazwę firmy")
    .max(120, "Nazwa firmy jest za długa"),
  email: emailSchema,
  password: newPasswordSchema,
  confirmPassword: z.string().min(1, "Powtórz hasło"),
  acceptTerms: z
    .boolean()
    .refine((accepted) => accepted, "Musisz zaakceptować regulamin"),
})

const passwordPair = registerFields.pick({
  password: true,
  confirmPassword: true,
})

export const registerSchema = registerFields.refine(
  (data) => data.password === data.confirmPassword,
  {
    path: ["confirmPassword"],
    message: "Hasła nie są identyczne",
    // Compare as soon as both password fields are valid, even if other
    // fields still have errors.
    when: (payload) => passwordPair.safeParse(payload.value).success,
  }
)

export type RegisterInput = z.input<typeof registerSchema>
export type RegisterData = z.output<typeof registerSchema>

export const resendVerificationSchema = z.object({ email: emailSchema })
