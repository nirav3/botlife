import type { ExerciseCatalog } from '@prisma/client';

jest.mock('../../src/lib/prisma');
import { prisma } from '../../src/lib/prisma';
import {
  loadExerciseCatalogCache,
  getExerciseCatalogEntry,
  __setExerciseCatalogCacheForTests,
  __clearExerciseCatalogCacheForTests,
} from '../../src/services/exerciseCatalog.service';

function row(overrides: Partial<ExerciseCatalog>): ExerciseCatalog {
  return {
    id: 'catalog-1',
    name: 'Dumbbell Curl',
    aliases: ['DB Curl', 'Bicep Curl'],
    muscleGroup: 'Biceps',
    bodyRegion: 'UPPER',
    movementPattern: 'ISOLATION',
    equipment: 'DUMBBELL',
    loadConvention: 'PER_SIDE',
    progressionType: 'REPS',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ExerciseCatalog;
}

afterEach(() => {
  __clearExerciseCatalogCacheForTests();
});

describe('getExerciseCatalogEntry', () => {
  it('negative: returns null when the cache has never been loaded', () => {
    expect(getExerciseCatalogEntry('Dumbbell Curl')).toBeNull();
  });

  it('positive: matches by exact canonical name, case/whitespace-insensitively', () => {
    __setExerciseCatalogCacheForTests([row({ name: 'Dumbbell Curl' })]);
    expect(getExerciseCatalogEntry('Dumbbell Curl')?.name).toBe('Dumbbell Curl');
    expect(getExerciseCatalogEntry('dumbbell curl')?.name).toBe('Dumbbell Curl');
    expect(getExerciseCatalogEntry('  Dumbbell Curl  ')?.name).toBe('Dumbbell Curl');
  });

  it('positive: matches by any alias', () => {
    __setExerciseCatalogCacheForTests([row({ name: 'Dumbbell Curl', aliases: ['DB Curl', 'Bicep Curl'] })]);
    expect(getExerciseCatalogEntry('DB Curl')?.name).toBe('Dumbbell Curl');
    expect(getExerciseCatalogEntry('bicep curl')?.name).toBe('Dumbbell Curl');
  });

  it('negative: an exercise with no matching row or alias returns null', () => {
    __setExerciseCatalogCacheForTests([row({ name: 'Dumbbell Curl' })]);
    expect(getExerciseCatalogEntry('Some Custom AI-Generated Exercise')).toBeNull();
  });
});

describe('loadExerciseCatalogCache', () => {
  it('positive: populates the cache from prisma.exerciseCatalog.findMany, keyed by name and aliases', async () => {
    (prisma.exerciseCatalog.findMany as jest.Mock).mockResolvedValue([
      row({ name: 'Dumbbell Curl', aliases: ['DB Curl'] }),
      row({ id: 'catalog-2', name: 'Barbell Back Squat', aliases: ['Squat'], bodyRegion: 'LOWER', progressionType: 'WEIGHT' }),
    ]);

    await loadExerciseCatalogCache();

    expect(getExerciseCatalogEntry('Dumbbell Curl')).not.toBeNull();
    expect(getExerciseCatalogEntry('DB Curl')).not.toBeNull();
    expect(getExerciseCatalogEntry('Squat')?.name).toBe('Barbell Back Squat');
  });
});
