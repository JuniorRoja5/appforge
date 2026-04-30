-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';

-- AlterTable: add columns (shortCode nullable initially for backfill)
ALTER TABLE "Booking" ADD COLUMN "appUserId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "shortCode" TEXT;
ALTER TABLE "Booking" ADD COLUMN "trackingToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "Booking" ADD COLUMN "customerName" TEXT;
ALTER TABLE "Booking" ADD COLUMN "customerEmail" TEXT;
ALTER TABLE "Booking" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "Booking" ADD COLUMN "customerNotes" TEXT;
ALTER TABLE "Booking" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "cancelledBy" TEXT;
ALTER TABLE "Booking" ADD COLUMN "reminder24hSentAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "reminder2hSentAt" TIMESTAMP(3);

-- Backfill shortCode for any existing rows
UPDATE "Booking" SET "shortCode" = 'BKG-' || UPPER(SUBSTRING(MD5("id"::text), 1, 6)) WHERE "shortCode" IS NULL;

-- Make shortCode NOT NULL going forward
ALTER TABLE "Booking" ALTER COLUMN "shortCode" SET NOT NULL;

-- CreateIndexes
CREATE UNIQUE INDEX "Booking_appId_shortCode_key" ON "Booking"("appId", "shortCode");
CREATE INDEX "Booking_appId_trackingToken_idx" ON "Booking"("appId", "trackingToken");
CREATE INDEX "Booking_appUserId_idx" ON "Booking"("appUserId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
