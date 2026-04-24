-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsArticle_appId_idx" ON "NewsArticle"("appId");

-- AddForeignKey
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
