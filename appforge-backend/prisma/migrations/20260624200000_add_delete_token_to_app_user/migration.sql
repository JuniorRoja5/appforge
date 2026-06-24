-- AlterTable
ALTER TABLE "AppUser" ADD COLUMN     "deleteToken" TEXT,
ADD COLUMN     "deleteTokenExpiry" TIMESTAMP(3);
