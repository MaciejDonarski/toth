-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "authenticatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing sessions were authenticated when they were created.
UPDATE "Session" SET "authenticatedAt" = "createdAt";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "WorkingHours" (
    "userId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("userId","weekday"),
    -- Same rules as the domain (core/users/domain/profile.ts).
    CONSTRAINT "WorkingHours_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7),
    CONSTRAINT "WorkingHours_range_check" CHECK ("startMinute" >= 0 AND "startMinute" < "endMinute" AND "endMinute" <= 1440)
);

-- AddForeignKey
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
