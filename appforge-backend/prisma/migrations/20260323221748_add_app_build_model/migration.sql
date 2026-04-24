-- CreateEnum
CREATE TYPE "BuildStatus" AS ENUM ('QUEUED', 'PREPARING', 'BUILDING', 'SIGNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "AppBuild" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "status" "BuildStatus" NOT NULL DEFAULT 'QUEUED',
    "buildType" TEXT NOT NULL DEFAULT 'debug',
    "schemaHash" TEXT NOT NULL,
    "logOutput" TEXT,
    "artifactUrl" TEXT,
    "artifactSize" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppBuild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppBuild_appId_idx" ON "AppBuild"("appId");

-- CreateIndex
CREATE INDEX "AppBuild_status_idx" ON "AppBuild"("status");

-- AddForeignKey
ALTER TABLE "AppBuild" ADD CONSTRAINT "AppBuild_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
