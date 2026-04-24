-- CreateEnum
CREATE TYPE "BuildType" AS ENUM ('DEBUG', 'RELEASE', 'AAB', 'IOS_EXPORT');

-- Convert existing string values to uppercase + normalize hyphens to underscores
UPDATE "AppBuild" SET "buildType" = UPPER(REPLACE("buildType", '-', '_'))
WHERE "buildType" IS NOT NULL;

-- Ensure ios-export rows are correctly mapped (UPPER + REPLACE already handles this, but be explicit)
UPDATE "AppBuild" SET "buildType" = 'IOS_EXPORT' WHERE "buildType" = 'IOS_EXPORT';

-- AlterColumn: change from String to BuildType enum
ALTER TABLE "AppBuild"
  ALTER COLUMN "buildType" DROP DEFAULT,
  ALTER COLUMN "buildType" TYPE "BuildType" USING "buildType"::"BuildType",
  ALTER COLUMN "buildType" SET DEFAULT 'DEBUG';
