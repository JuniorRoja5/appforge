-- CreateTable
CREATE TABLE "CouponMerchantConfig" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "businessPin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponMerchantConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CouponMerchantConfig_appId_key" ON "CouponMerchantConfig"("appId");

-- AddForeignKey
ALTER TABLE "CouponMerchantConfig" ADD CONSTRAINT "CouponMerchantConfig_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
