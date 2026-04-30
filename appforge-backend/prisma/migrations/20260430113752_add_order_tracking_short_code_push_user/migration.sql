-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shortCode" TEXT NOT NULL DEFAULT '',
                    ADD COLUMN     "trackingToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- Backfill any existing rows (table is empty in dev, but safe in prod too)
UPDATE "Order" SET "shortCode" = 'ORD-' || UPPER(SUBSTRING(MD5("id"::text), 1, 6)) WHERE "shortCode" = '';

-- Drop the temporary defaults; shortCode must be set explicitly going forward,
-- trackingToken keeps the default at the application level via Prisma
ALTER TABLE "Order" ALTER COLUMN "shortCode" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PushDevice" ADD COLUMN     "appUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_appId_shortCode_key" ON "Order"("appId", "shortCode");

-- CreateIndex
CREATE INDEX "Order_appId_trackingToken_idx" ON "Order"("appId", "trackingToken");

-- CreateIndex
CREATE INDEX "Order_appUserId_idx" ON "Order"("appUserId");

-- CreateIndex
CREATE INDEX "PushDevice_appUserId_idx" ON "PushDevice"("appUserId");

-- AddForeignKey
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
