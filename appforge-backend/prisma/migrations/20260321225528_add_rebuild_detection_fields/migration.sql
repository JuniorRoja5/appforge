-- AlterTable
ALTER TABLE "App" ADD COLUMN     "lastBuiltAt" TIMESTAMP(3),
ADD COLUMN     "lastBuiltSchema" JSONB,
ADD COLUMN     "needsRebuild" BOOLEAN NOT NULL DEFAULT true;
