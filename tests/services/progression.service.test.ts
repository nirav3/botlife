import type { ExerciseCatalog } from '@prisma/client';
import { getProgressionType, isLowerBody, buildPerSetSuggestions } from '../../src/services/progression.service';
import {
  __setExerciseCatalogCacheForTests,
  __clearExerciseCatalogCacheForTests,
} from '../../src/services/exerciseCatalog.service';

function catalogRow(overrides: Partial<ExerciseCatalog>): ExerciseCatalog {
  return {
    id: 'catalog-1',
    name: 'Test Exercise',
    aliases: [],
    muscleGroup: 'Test',
    bodyRegion: 'UPPER',
    movementPattern: 'ISOLATION',
    equipment: 'OTHER',
    loadConvention: 'TOTAL',
    progressionType: 'REPS',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ExerciseCatalog;
}

afterEach(() => {
  __clearExerciseCatalogCacheForTests();
});

describe('getProgressionType', () => {
  it('positive: classifies compound barbell/machine lifts as weight-type', () => {
    expect(getProgressionType('Barbell Squat')).toBe('weight');
    expect(getProgressionType('Deadlift')).toBe('weight');
    expect(getProgressionType('Bench Press')).toBe('weight');
    expect(getProgressionType('Barbell Row')).toBe('weight');
    expect(getProgressionType('Overhead Press')).toBe('weight');
  });

  it('positive: classifies isolation/cable/bodyweight movements as reps-type', () => {
    expect(getProgressionType('Pull-up')).toBe('reps');
    expect(getProgressionType('Push Up')).toBe('reps');
    expect(getProgressionType('Bicep Curl')).toBe('reps');
    expect(getProgressionType('Cable Lateral Raise')).toBe('reps');
    expect(getProgressionType('Tricep Pushdown')).toBe('reps');
    expect(getProgressionType('Dip')).toBe('reps');
  });

  it('negative: is case-insensitive', () => {
    expect(getProgressionType('PULL-UP')).toBe('reps');
    expect(getProgressionType('barbell SQUAT')).toBe('weight');
  });

  it('positive: a catalog match wins over what the keyword guess would say', () => {
    // "Curl" would normally keyword-match to 'reps' — force the opposite via
    // the catalog to prove the catalog is actually consulted first, not just
    // present without being used.
    __setExerciseCatalogCacheForTests([catalogRow({ name: 'Curl', progressionType: 'WEIGHT' })]);
    expect(getProgressionType('Curl')).toBe('weight');
  });

  it('negative: falls back to the keyword guess for an exercise not in the catalog', () => {
    __setExerciseCatalogCacheForTests([catalogRow({ name: 'Some Other Exercise' })]);
    expect(getProgressionType('Dumbbell Curl')).toBe('reps'); // keyword fallback, unaffected by the unrelated catalog row
  });

  it('negative: a catalog entry with no progressionType (TIME-based, e.g. Plank) falls back to the keyword guess', () => {
    __setExerciseCatalogCacheForTests([catalogRow({ name: 'Plank', progressionType: null })]);
    expect(getProgressionType('Plank')).toBe('reps'); // 'plank' keyword match, not a crash on the null
  });
});

describe('isLowerBody', () => {
  it('positive: a catalog match wins over what the keyword guess would say', () => {
    // "Curl" would normally keyword-match to upper body (false) — force LOWER
    // via the catalog to prove precedence.
    __setExerciseCatalogCacheForTests([catalogRow({ name: 'Curl', bodyRegion: 'LOWER' })]);
    expect(isLowerBody('Curl')).toBe(true);
  });

  it('negative: falls back to the keyword guess for an exercise not in the catalog', () => {
    __setExerciseCatalogCacheForTests([catalogRow({ name: 'Some Other Exercise', bodyRegion: 'UPPER' })]);
    expect(isLowerBody('Barbell Back Squat')).toBe(true); // keyword fallback ('squat')
    expect(isLowerBody('Bench Press')).toBe(false);
  });

  it('negative: FULL_BODY catalog entries are not treated as lower body', () => {
    __setExerciseCatalogCacheForTests([catalogRow({ name: 'Burpees', bodyRegion: 'FULL_BODY' })]);
    expect(isLowerBody('Burpees')).toBe(false);
  });
});

describe('buildPerSetSuggestions', () => {
  it('positive: weight-type ramps ascending toward the target, reps held constant', () => {
    const sets = buildPerSetSuggestions('weight', 100, 8, 3);

    expect(sets).toHaveLength(3);
    expect(sets.every((s) => s.reps === 8)).toBe(true);
    // Strictly ascending weight, last set hits the full target.
    expect(sets[0].weightKg).toBeLessThan(sets[1].weightKg);
    expect(sets[1].weightKg).toBeLessThan(sets[2].weightKg);
    expect(sets[2].weightKg).toBe(100);
    // Not the old flat behavior — sets must differ from each other.
    const uniqueWeights = new Set(sets.map((s) => s.weightKg));
    expect(uniqueWeights.size).toBeGreaterThan(1);
  });

  it('positive: weight-type with a single set just returns the target with no ramp', () => {
    const sets = buildPerSetSuggestions('weight', 100, 8, 1);
    expect(sets).toEqual([{ setNumber: 1, weightKg: 100, reps: 8 }]);
  });

  it('positive: reps-type holds weight constant across all sets', () => {
    const sets = buildPerSetSuggestions('reps', 20, 10, 3);

    expect(sets).toHaveLength(3);
    expect(sets.every((s) => s.weightKg === 20)).toBe(true);
    // Reps vary across sets instead of being the same flat number everywhere.
    const uniqueReps = new Set(sets.map((s) => s.reps));
    expect(uniqueReps.size).toBeGreaterThan(1);
  });

  it('negative: reps never drop below 1 even with a low target', () => {
    const sets = buildPerSetSuggestions('reps', 20, 1, 5);
    expect(sets.every((s) => s.reps >= 1)).toBe(true);
  });

  it('negative: clamps an unreasonable set count into a sane range', () => {
    const sets = buildPerSetSuggestions('weight', 100, 8, 50);
    expect(sets.length).toBeLessThanOrEqual(6);

    const noSets = buildPerSetSuggestions('weight', 100, 8, 0);
    expect(noSets.length).toBeGreaterThanOrEqual(1);
  });

  it('positive: setNumber is sequential starting at 1', () => {
    const sets = buildPerSetSuggestions('weight', 100, 8, 4);
    expect(sets.map((s) => s.setNumber)).toEqual([1, 2, 3, 4]);
  });
});
