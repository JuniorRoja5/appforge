-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fileUrls" TEXT[],
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactSubmission_appId_idx" ON "ContactSubmission"("appId");

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
