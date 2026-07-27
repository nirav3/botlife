// ─── Fallback starting-weight estimate for an exercise with no logged history ──
// Formula: bodyweight × muscle-group-category multiplier × age factor.
// This is only ever a *starting point* the user is expected to adjust — the
// moment real history exists for an exercise, the progression engine's own
// suggestion takes over (see progression.service.ts on the backend).

export type Sex = 'MALE' | 'FEMALE';

// Large, multi-joint compound lifts vs. smaller isolation/stabilizer work —
// mapped from the muscleGroup strings actually used across the app's plans.
const CORE_MUSCLE_GROUPS = new Set(['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Chest', 'Back', 'Full Body']);
const ISOLATION_MUSCLE_GROUPS = new Set(['Shoulders', 'Rear Delts', 'Biceps', 'Triceps', 'Calves', 'Core']);

// Low end of each range (per product decision: undersuggest rather than
// discourage a first-timer with too heavy a number). Female uses the same
// numbers at -20%; an unspecified sex falls back to these (male) values as
// the neutral baseline, not an assumption that the user is male.
const BASE_MULTIPLIER: Record<'core' | 'isolation', number> = {
  core: 0.8,
  isolation: 0.2,
};
const FEMALE_ADJUSTMENT = 0.8; // -20%

// Age brackets, anchored so 30–39 (the original reference age) is 1.0 —
// i.e. no adjustment. Deliberately coarse; this is a rough starting nudge,
// not a fitness-science model.
const AGE_BRACKETS: { maxAge: number; factor: number }[] = [
  { maxAge: 20, factor: 0.85 },
  { maxAge: 30, factor: 0.95 },
  { maxAge: 40, factor: 1.0 },
  { maxAge: 50, factor: 0.9 },
  { maxAge: 60, factor: 0.8 },
  { maxAge: Infinity, factor: 0.7 },
];

const BASELINE_AGE = 35; // midpoint of the 30–39 "no adjustment" bracket

function getCategory(muscleGroup: string): 'core' | 'isolation' | null {
  if (CORE_MUSCLE_GROUPS.has(muscleGroup)) return 'core';
  if (ISOLATION_MUSCLE_GROUPS.has(muscleGroup)) return 'isolation';
  return null; // Cardio, Recovery, Warm-up, or a custom/unrecognized group
}

export function getAgeFromDateOfBirth(dateOfBirth: string | Date): number {
  const ms = Date.now() - new Date(dateOfBirth).getTime();
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

function getAgeFactor(age: number): number {
  const bracket = AGE_BRACKETS.find((b) => age < b.maxAge);
  return bracket ? bracket.factor : 1.0;
}

export interface DefaultWeightInput {
  dateOfBirth?: string | Date | null;
  sex?: Sex | null;
  muscleGroup?: string | null;
  bodyweightKg?: number | null;
}

/**
 * Returns a rough starting-weight suggestion in kg, or null when there isn't
 * enough info to make one (no bodyweight logged yet, or the muscle group
 * doesn't map to a known category) — callers should fall back to a generic
 * placeholder in that case.
 */
export function getDefaultStartingWeightKg({
  dateOfBirth,
  sex,
  muscleGroup,
  bodyweightKg,
}: DefaultWeightInput): number | null {
  if (!bodyweightKg || bodyweightKg <= 0) return null;
  if (!muscleGroup) return null;

  const category = getCategory(muscleGroup);
  if (!category) return null;

  const base = BASE_MULTIPLIER[category] * (sex === 'FEMALE' ? FEMALE_ADJUSTMENT : 1);
  const age = dateOfBirth ? getAgeFromDateOfBirth(dateOfBirth) : BASELINE_AGE;
  const ageFactor = getAgeFactor(age);

  return Math.round(bodyweightKg * base * ageFactor * 100) / 100;
}
