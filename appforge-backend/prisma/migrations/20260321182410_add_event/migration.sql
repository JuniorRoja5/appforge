-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "location" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_appId_idx" ON "Event"("appId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
