-- AlterEnum
ALTER TYPE "BuildType" ADD VALUE 'PWA';

-- AlterTable
ALTER TABLE "App" ADD COLUMN     "pwaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pwaLastDeployedAt" TIMESTAMP(3),
ADD COLUMN     "pwaUrl" TEXT;

-- AlterTable
ALTER TABLE "PushDevice" ADD COLUMN     "webPushSubscription" JSONB;
