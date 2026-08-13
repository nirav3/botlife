-- CreateEnum
CREATE TYPE "ExerciseBodyRegion" AS ENUM ('UPPER', 'LOWER', 'FULL_BODY');

-- CreateEnum
CREATE TYPE "ExerciseMovementPattern" AS ENUM ('COMPOUND', 'ISOLATION');

-- CreateEnum
CREATE TYPE "ExerciseEquipment" AS ENUM ('BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'KETTLEBELL', 'BODYWEIGHT', 'BAND', 'OTHER');

-- CreateEnum
CREATE TYPE "ExerciseLoadConvention" AS ENUM ('TOTAL', 'PER_SIDE', 'BODYWEIGHT', 'BODYWEIGHT_LOADABLE', 'TIME');

-- CreateEnum
CREATE TYPE "ExerciseProgressionType" AS ENUM ('WEIGHT', 'REPS');

-- CreateTable
CREATE TABLE "exercise_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "muscleGroup" TEXT NOT NULL,
    "bodyRegion" "ExerciseBodyRegion" NOT NULL,
    "movementPattern" "ExerciseMovementPattern" NOT NULL,
    "equipment" "ExerciseEquipment" NOT NULL,
    "loadConvention" "ExerciseLoadConvention" NOT NULL,
    "progressionType" "ExerciseProgressionType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercise_catalog_name_key" ON "exercise_catalog"("name");
