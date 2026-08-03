import { describe, it, expect } from 'vitest';
import { getDefaultStartingWeightKg, isBodyweightExercise } from '@/lib/defaultWeight';

function dobForAge(age: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d;
}

describe('getDefaultStartingWeightKg: matches the approved worked-example table', () => {
  const cases: [age: number, factor: number][] = [
    [18, 0.85],
    [25, 0.95],
    [35, 1.0],
    [45, 0.9],
    [55, 0.8],
    [65, 0.7],
  ];

  it.each(cases)('positive: age %i (factor %s) — male Core on an 80kg bodyweight', (age, factor) => {
    const result = getDefaultStartingWeightKg({
      dateOfBirth: dobForAge(age),
      sex: 'MALE',
      muscleGroup: 'Legs',
      bodyweightKg: 80,
    });
    expect(result).toBeCloseTo(80 * 0.8 * factor, 1);
  });

  it.each(cases)('positive: age %i (factor %s) — male Isolation on an 80kg bodyweight', (age, factor) => {
    const result = getDefaultStartingWeightKg({
      dateOfBirth: dobForAge(age),
      sex: 'MALE',
      muscleGroup: 'Biceps',
      bodyweightKg: 80,
    });
    expect(result).toBeCloseTo(80 * 0.2 * factor, 1);
  });

  it.each(cases)('positive: age %i (factor %s) — female Core on a 65kg bodyweight', (age, factor) => {
    const result = getDefaultStartingWeightKg({
      dateOfBirth: dobForAge(age),
      sex: 'FEMALE',
      muscleGroup: 'Back',
      bodyweightKg: 65,
    });
    expect(result).toBeCloseTo(65 * 0.64 * factor, 1);
  });

  it.each(cases)('positive: age %i (factor %s) — female Isolation on a 65kg bodyweight', (age, factor) => {
    const result = getDefaultStartingWeightKg({
      dateOfBirth: dobForAge(age),
      sex: 'FEMALE',
      muscleGroup: 'Triceps',
      bodyweightKg: 65,
    });
    expect(result).toBeCloseTo(65 * 0.16 * factor, 1);
  });
});

describe('getDefaultStartingWeightKg: negative/edge cases', () => {
  it('negative: no bodyweight logged yet → null, not a bogus 0 or NaN', () => {
    expect(getDefaultStartingWeightKg({ muscleGroup: 'Legs', bodyweightKg: null })).toBeNull();
    expect(getDefaultStartingWeightKg({ muscleGroup: 'Legs', bodyweightKg: 0 })).toBeNull();
  });

  it('negative: an unrecognized/non-lifting muscle group (Cardio, Recovery, Warm-up) → null', () => {
    expect(getDefaultStartingWeightKg({ muscleGroup: 'Cardio', bodyweightKg: 80 })).toBeNull();
    expect(getDefaultStartingWeightKg({ muscleGroup: 'Warm-up', bodyweightKg: 80 })).toBeNull();
    expect(getDefaultStartingWeightKg({ muscleGroup: 'Some Custom Group', bodyweightKg: 80 })).toBeNull();
  });

  it('negative: missing dateOfBirth falls back to the 30-39 baseline (factor 1.0), not a crash', () => {
    const result = getDefaultStartingWeightKg({ sex: 'MALE', muscleGroup: 'Legs', bodyweightKg: 80 });
    expect(result).toBeCloseTo(80 * 0.8 * 1.0, 1);
  });

  it('negative: missing/unspecified sex falls back to the male baseline, not a crash or a female discount applied incorrectly', () => {
    const result = getDefaultStartingWeightKg({
      dateOfBirth: dobForAge(35),
      muscleGroup: 'Legs',
      bodyweightKg: 80,
    });
    expect(result).toBeCloseTo(80 * 0.8 * 1.0, 1); // same as explicit MALE, not the -20% female figure
  });
});

describe('isBodyweightExercise', () => {
  it.each([
    'Pull-up', 'Pull Up', 'Pullups', 'Weighted Pull-ups',
    'Chin-up', 'Chinups',
    'Push-up', 'Pushups',
    'Dips', 'Ring Dips', 'Bench Dips',
    'Muscle-up', 'Muscleups',
    'Inverted Row',
    'TRX / Ring Row', 'TRX Row',
    'Pistol Squat',
  ])('positive: %s is recognized as a bodyweight exercise', (name) => {
    expect(isBodyweightExercise(name)).toBe(true);
  });

  it.each(['Barbell Row', 'Lat Pulldown', 'Bench Press', 'Bicep Curl'])(
    'negative: %s (loaded, not bodyweight) is not flagged',
    (name) => {
      expect(isBodyweightExercise(name)).toBe(false);
    }
  );

  it('negative: no exercise name → false, not a crash', () => {
    expect(isBodyweightExercise(null)).toBe(false);
    expect(isBodyweightExercise(undefined)).toBe(false);
  });
});

describe('getDefaultStartingWeightKg: bodyweight exercises', () => {
  it('positive: Pull-ups (Back, would otherwise get 0.8x bodyweight) suggest 0 added weight instead', () => {
    const result = getDefaultStartingWeightKg({
      dateOfBirth: dobForAge(35),
      sex: 'MALE',
      muscleGroup: 'Back',
      exerciseName: 'Pull-ups',
      bodyweightKg: 80,
    });
    expect(result).toBe(0);
  });

  it('positive: bodyweight suggestion applies even without a logged bodyweight — you always start unloaded', () => {
    const result = getDefaultStartingWeightKg({
      muscleGroup: 'Back',
      exerciseName: 'Chin-ups',
      bodyweightKg: null,
    });
    expect(result).toBe(0);
  });

  it('negative: a loaded Back exercise (e.g. Barbell Row) still gets the 0.8x bodyweight estimate', () => {
    const result = getDefaultStartingWeightKg({
      dateOfBirth: dobForAge(35),
      sex: 'MALE',
      muscleGroup: 'Back',
      exerciseName: 'Barbell Row',
      bodyweightKg: 80,
    });
    expect(result).toBeCloseTo(80 * 0.8 * 1.0, 1);
  });
});
