-- AlterTable
ALTER TABLE "App" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "App_tenantId_deletedAt_idx" ON "App"("tenantId", "deletedAt");
