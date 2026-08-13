import { prisma } from '../lib/prisma';
import { EXERCISE_CATALOG } from '../data/exerciseCatalog';

/**
 * Upserts the curated exercise catalog at boot. Unlike planSeed.service.ts
 * (which only creates official plans if missing, since a user's own copy
 * shouldn't be clobbered), this is pure reference data nobody else ever
 * writes to — so it's a real upsert, meaning fixes/additions to
 * exerciseCatalog.ts take effect on the next restart, not just for rows
 * that don't exist yet.
 */
export async function ensureExerciseCatalogSeeded(): Promise<void> {
  for (const entry of EXERCISE_CATALOG) {
    await prisma.exerciseCatalog.upsert({
      where: { name: entry.name },
      update: {
        aliases: entry.aliases,
        muscleGroup: entry.muscleGroup,
        bodyRegion: entry.bodyRegion,
        movementPattern: entry.movementPattern,
        equipment: entry.equipment,
        loadConvention: entry.loadConvention,
        progressionType: entry.progressionType,
      },
      create: {
        name: entry.name,
        aliases: entry.aliases,
        muscleGroup: entry.muscleGroup,
        bodyRegion: entry.bodyRegion,
        movementPattern: entry.movementPattern,
        equipment: entry.equipment,
        loadConvention: entry.loadConvention,
        progressionType: entry.progressionType,
      },
    });
  }
}
