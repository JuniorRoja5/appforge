-- AlterTable
ALTER TABLE "App" ADD COLUMN     "appConfig" JSONB;

-- CreateTable
CREATE TABLE "AppSmtpConfig" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL,
    "encryptedPass" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSmtpConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSmtpConfig_appId_key" ON "AppSmtpConfig"("appId");

-- AddForeignKey
ALTER TABLE "AppSmtpConfig" ADD CONSTRAINT "AppSmtpConfig_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
