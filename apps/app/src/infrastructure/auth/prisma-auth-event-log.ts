import type {
  AuthEvent,
  AuthEventLog,
} from "@/core/auth/application/ports/auth-event-log"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"

export class PrismaAuthEventLog implements AuthEventLog {
  constructor(private readonly db: PrismaClient) {}

  async record(event: AuthEvent): Promise<void> {
    await this.db.authEvent.create({
      data: {
        type: event.type,
        userId: event.userId,
        companyId: event.companyId,
        ip: event.ip,
        userAgent: event.userAgent,
        meta: event.meta as Prisma.InputJsonValue | undefined,
      },
    })
  }
}
