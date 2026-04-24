-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryItem_appId_idx" ON "GalleryItem"("appId");

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
