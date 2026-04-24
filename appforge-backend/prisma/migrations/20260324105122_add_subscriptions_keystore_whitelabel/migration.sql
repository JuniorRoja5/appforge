/*
  Warnings:

  - You are about to drop the column `plan` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `planId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'STARTER', 'PRO', 'RESELLER_STARTER', 'RESELLER_PRO');

-- AlterTable
ALTER TABLE "App" ADD COLUMN     "clientEmail" TEXT,
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "clientNotes" TEXT;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "plan",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "planId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "brandColors" JSONB,
ADD COLUMN     "brandDomain" TEXT,
ADD COLUMN     "brandLogoUrl" TEXT,
ADD COLUMN     "brandName" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "maxApps" INTEGER NOT NULL,
    "maxBuildsPerMonth" INTEGER NOT NULL,
    "storageGb" DOUBLE PRECISION NOT NULL,
    "canBuild" BOOLEAN NOT NULL,
    "isWhiteLabel" BOOLEAN NOT NULL,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppKeystore" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "keystorePath" TEXT NOT NULL,
    "storePassword" TEXT NOT NULL,
    "keyAlias" TEXT NOT NULL DEFAULT 'appforge',
    "keyPassword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppKeystore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_planType_key" ON "SubscriptionPlan"("planType");

-- CreateIndex
CREATE UNIQUE INDEX "AppKeystore_appId_key" ON "AppKeystore"("appId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppKeystore" ADD CONSTRAINT "AppKeystore_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
