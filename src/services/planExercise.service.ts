import { prisma } from '../lib/prisma';

// Exercise substitute pool (for the "swap exercise" feature). Draws from
// PlanExercise rows across public/sample plans plus the user's own plans —
// the same catalog that used to live in the static workoutPlans.ts file,
// now that plans are DB-backed.
export async function getExerciseSubstitutes(
  muscleGroup: string | null,
  excludeName: string,
  userId?: string
): Promise<string[]> {
  const exercises = await prisma.planExercise.findMany({
    where: {
      ...(muscleGroup ? { muscleGroup: { equals: muscleGroup, mode: 'insensitive' } } : {}),
      day: {
        plan: {
          OR: [{ visibility: 'PUBLIC' }, ...(userId ? [{ ownerId: userId }] : [])],
        },
      },
    },
    select: { name: true },
    distinct: ['name'],
  });

  const exclude = excludeName.trim().toLowerCase();
  const seen = new Set<string>();
  const names: string[] = [];

  for (const ex of exercises) {
    const key = ex.name.trim().toLowerCase();
    if (key === exclude || seen.has(key)) continue;
    seen.add(key);
    names.push(ex.name);
  }

  return names;
}
