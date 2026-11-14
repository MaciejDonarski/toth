-- AlterTable
ALTER TABLE "User" ADD COLUMN     "color" TEXT;

-- Existing users get a random color from the palette (core/users/domain/user-color.ts).
UPDATE "User" SET "color" = (ARRAY['red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'])[1 + floor(random() * 17)::int];

ALTER TABLE "User" ALTER COLUMN "color" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_color_check" CHECK ("color" IN ('red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'));
