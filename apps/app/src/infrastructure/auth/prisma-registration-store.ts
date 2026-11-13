import type {
  NewCompanyRegistration,
  RegistrationStore,
} from "@/core/auth/application/ports/registration-store"
import { Prisma, type PrismaClient } from "@/generated/prisma/client"

export class PrismaRegistrationStore implements RegistrationStore {
  constructor(private readonly db: PrismaClient) {}

  async registerCompanyWithAdmin(
    input: NewCompanyRegistration
  ): Promise<{ userId: string; companyId: string } | "EMAIL_TAKEN"> {
    try {
      // Nested create = a single transaction: company, admin and token
      // either all exist or none do.
      const company = await this.db.company.create({
        data: {
          name: input.companyName,
          userLimit: input.userLimit,
          users: {
            create: {
              email: input.email,
              name: input.name,
              passwordHash: input.passwordHash,
              role: "ADMIN",
              termsVersion: input.termsVersion,
              termsAcceptedAt: input.termsAcceptedAt,
              authTokens: {
                create: {
                  type: "EMAIL_VERIFICATION",
                  tokenHash: input.verificationTokenHash,
                  expiresAt: input.verificationExpiresAt,
                },
              },
            },
          },
        },
        select: { id: true, users: { select: { id: true } } },
      })
      const user = company.users[0]
      if (!user) throw new Error("Registration created no user")
      return { userId: user.id, companyId: company.id }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return "EMAIL_TAKEN"
      }
      throw error
    }
  }
}
