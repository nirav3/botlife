-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "sex" "Sex",
ADD COLUMN     "onboardingSkipped" BOOLEAN NOT NULL DEFAULT false;
