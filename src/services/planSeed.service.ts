import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { WORKOUT_PLANS } from '../data/workoutPlans';

// Self-bootstrapping seed for the official/sample workout plans. Runs at
// server boot. Uses each plan's stable static `id` (e.g. "starting-strength")
// as the DB row's primary key so this is a true per-plan idempotent upsert —
// safe even if multiple server instances (or ts-node-dev respawns) race each
// other, since a duplicate insert just hits a primary-key conflict and is
// ignored rather than creating a second copy.
export async function ensurePlansSeeded(): Promise<void> {
  for (const plan of WORKOUT_PLANS) {
    const exists = await prisma.workoutPlan.findUnique({ where: { id: plan.id } });
    if (exists) continue;

    try {
      await seedPlan(plan);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        continue; // another process seeded this one concurrently
      }
      throw err;
    }
  }
}

async function seedPlan(plan: (typeof WORKOUT_PLANS)[number]): Promise<void> {
  await prisma.workoutPlan.create({
    data: {
      id: plan.id,
      ownerId: null,
      visibility: 'PUBLIC',
      name: plan.name,
      description: plan.description,
      difficulty: plan.difficulty,
      goal: plan.goal,
      daysPerWeek: plan.daysPerWeek,
      estimatedMinutes: plan.estimatedMinutes,
      tags: plan.tags,
      days: {
        create: plan.days.map((day) => ({
          dayNumber: day.dayNumber,
          label: day.label,
          sessionName: day.sessionName,
          exercises: {
            create: day.exercises.map((ex, exIndex) => ({
              name: ex.name,
              muscleGroup: ex.muscleGroup,
              notes: ex.notes ?? null,
              orderIndex: exIndex,
              sets: {
                create: ex.sets.map((s) => ({
                  setNumber: s.setNumber,
                  targetReps: s.targetReps,
                  rpe: s.rpe ?? null,
                  isWarmup: s.isWarmup ?? false,
                })),
              },
            })),
          },
        })),
      },
    },
  });

  console.log(`✅ Seeded official plan: ${plan.name}`);
}
