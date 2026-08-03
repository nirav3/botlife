-- AlterTable
ALTER TABLE "workout_sessions" ADD COLUMN     "dayNumber" INTEGER,
ADD COLUMN     "planId" TEXT;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "workout_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
