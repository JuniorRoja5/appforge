-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "allergens" TEXT[],
    "available" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCoupon" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "conditions" TEXT,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogCollection" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "comparePrice" DECIMAL(10,2),
    "imageUrls" TEXT[],
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuCategory_appId_idx" ON "MenuCategory"("appId");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");

-- CreateIndex
CREATE INDEX "DiscountCoupon_appId_idx" ON "DiscountCoupon"("appId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCoupon_appId_code_key" ON "DiscountCoupon"("appId", "code");

-- CreateIndex
CREATE INDEX "CatalogCollection_appId_idx" ON "CatalogCollection"("appId");

-- CreateIndex
CREATE INDEX "CatalogProduct_collectionId_idx" ON "CatalogProduct"("collectionId");

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCoupon" ADD CONSTRAINT "DiscountCoupon_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogCollection" ADD CONSTRAINT "CatalogCollection_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "CatalogCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
