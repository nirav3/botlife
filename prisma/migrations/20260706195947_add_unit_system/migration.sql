-- CreateEnum
CREATE TYPE "UnitSystem" AS ENUM ('METRIC', 'IMPERIAL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "unitSystem" "UnitSystem" NOT NULL DEFAULT 'METRIC';
