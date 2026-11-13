import { z } from "zod"

import { emailSchema, newPasswordSchema } from "@/core/auth/application/schemas"
import { ROLES } from "@/core/auth/domain/role"

export const roleSchema = z.enum(ROLES, "Wybierz rolę")

export const inviteUserSchema = z.object({
  email: emailSchema,
  role: roleSchema,
})

export type InviteUserInput = z.input<typeof inviteUserSchema>

const acceptFields = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Podaj imię i nazwisko")
    .max(100, "Imię i nazwisko jest za długie"),
  password: newPasswordSchema,
  confirmPassword: z.string().min(1, "Powtórz hasło"),
  acceptTerms: z
    .boolean()
    .refine((accepted) => accepted, "Musisz zaakceptować regulamin"),
})

const passwordPair = acceptFields.pick({
  password: true,
  confirmPassword: true,
})

export const acceptInvitationSchema = acceptFields.refine(
  (data) => data.password === data.confirmPassword,
  {
    path: ["confirmPassword"],
    message: "Hasła nie są identyczne",
    when: (payload) => passwordPair.safeParse(payload.value).success,
  }
)

export type AcceptInvitationInput = z.input<typeof acceptInvitationSchema>

export const memberIdSchema = z.string().min(1).max(64)
