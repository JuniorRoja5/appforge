-- CreateEnum
CREATE TYPE "AppUserStatus" AS ENUM ('ACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "PushNotificationStatus" AS ENUM ('DRAFT', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'READY', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "status" "AppUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFcmConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "serviceAccountJson" TEXT NOT NULL,
    "googleServicesJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFcmConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushNotification" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "data" JSONB,
    "status" "PushNotificationStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FanPost" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FanPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FanLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FanLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "moduleId" TEXT,
    "platform" TEXT NOT NULL,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appUserId" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSession" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appUserId" TEXT,
    "platform" TEXT NOT NULL,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyCard" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "totalStamps" INTEGER NOT NULL DEFAULT 10,
    "reward" TEXT NOT NULL,
    "rewardDescription" TEXT,
    "businessPin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyStamp" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "stampedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyStamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyRedemption" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "appUserId" TEXT,
    "deviceId" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appUserId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "customerNotes" TEXT,
    "items" JSONB NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppUser_appId_idx" ON "AppUser"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_appId_email_key" ON "AppUser"("appId", "email");

-- CreateIndex
CREATE INDEX "PushDevice_appId_idx" ON "PushDevice"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "PushDevice_appId_token_key" ON "PushDevice"("appId", "token");

-- CreateIndex
CREATE INDEX "PushNotification_appId_createdAt_idx" ON "PushNotification"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPost_appId_createdAt_idx" ON "SocialPost"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialComment_postId_createdAt_idx" ON "SocialComment"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialLike_postId_appUserId_key" ON "SocialLike"("postId", "appUserId");

-- CreateIndex
CREATE INDEX "FanPost_appId_createdAt_idx" ON "FanPost"("appId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FanLike_postId_appUserId_key" ON "FanLike"("postId", "appUserId");

-- CreateIndex
CREATE INDEX "ContentReport_appId_resolved_idx" ON "ContentReport"("appId", "resolved");

-- CreateIndex
CREATE UNIQUE INDEX "ContentReport_appUserId_targetType_targetId_key" ON "ContentReport"("appUserId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_appId_timestamp_idx" ON "AnalyticsEvent"("appId", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_appId_eventType_timestamp_idx" ON "AnalyticsEvent"("appId", "eventType", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_appId_moduleId_timestamp_idx" ON "AnalyticsEvent"("appId", "moduleId", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsSession_appId_startedAt_idx" ON "AnalyticsSession"("appId", "startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsSession_appId_appUserId_idx" ON "AnalyticsSession"("appId", "appUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCard_appId_key" ON "LoyaltyCard"("appId");

-- CreateIndex
CREATE INDEX "LoyaltyStamp_appId_appUserId_idx" ON "LoyaltyStamp"("appId", "appUserId");

-- CreateIndex
CREATE INDEX "LoyaltyStamp_appId_createdAt_idx" ON "LoyaltyStamp"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyRedemption_appId_appUserId_idx" ON "LoyaltyRedemption"("appId", "appUserId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");

-- CreateIndex
CREATE INDEX "CouponRedemption_appId_couponId_idx" ON "CouponRedemption"("appId", "couponId");

-- CreateIndex
CREATE INDEX "Order_appId_status_idx" ON "Order"("appId", "status");

-- CreateIndex
CREATE INDEX "Order_appId_createdAt_idx" ON "Order"("appId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushNotification" ADD CONSTRAINT "PushNotification_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialLike" ADD CONSTRAINT "SocialLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialLike" ADD CONSTRAINT "SocialLike_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanPost" ADD CONSTRAINT "FanPost_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanPost" ADD CONSTRAINT "FanPost_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanLike" ADD CONSTRAINT "FanLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FanPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanLike" ADD CONSTRAINT "FanLike_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSession" ADD CONSTRAINT "AnalyticsSession_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyStamp" ADD CONSTRAINT "LoyaltyStamp_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyStamp" ADD CONSTRAINT "LoyaltyStamp_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyRedemption" ADD CONSTRAINT "LoyaltyRedemption_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyRedemption" ADD CONSTRAINT "LoyaltyRedemption_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "DiscountCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

