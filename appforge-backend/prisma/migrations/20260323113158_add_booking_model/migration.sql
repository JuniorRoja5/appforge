-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "formData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_appId_idx" ON "Booking"("appId");

-- CreateIndex
CREATE INDEX "Booking_appId_date_idx" ON "Booking"("appId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_appId_date_timeSlot_key" ON "Booking"("appId", "date", "timeSlot");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
