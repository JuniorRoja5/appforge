-- AlterTable
ALTER TABLE "ImpersonationLog" ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedBy" TEXT;
