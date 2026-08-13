// ─── Fallback starting-weight estimate for an exercise with no logged history ──
// Formula: bodyweight × muscle-group-category multiplier × age factor.
// This is only ever a *starting point* the user is expected to adjust — the
// moment real history exists for an exercise, the progression engine's own
// suggestion takes over (see progression.service.ts on the backend).
//
// Every classification below (bodyweight-only, per-dumbbell, compound vs.
// isolation) prefers a structured ExerciseCatalog match when the caller has
// one — see client/src/lib/exerciseCatalog.ts — and only falls back to the
// keyword guess for an exercise the catalog doesn't know about. The catalog
// argument is always optional so these stay usable (and testable) with just
// a name/muscleGroup string, same as before it existed.

import type { ExerciseCatalogEntry } from '@/types';

export type Sex = 'MALE' | 'FEMALE';

// Large, multi-joint compound lifts vs. smaller isolation/stabilizer work.
// muscleGroup is a free-text field everywhere it's entered (Plan Builder's
// input, the AI chat schema, custom plans) — there's no enum constraining it
// to the official seed plans' exact vocabulary ('Quads', 'Core', ...), so an
// exact-string Set lookup silently failed on any real-world synonym a user
// or the AI actually typed (e.g. "Quadriceps", "Abs"). Keyword/substring
// matching instead, same approach as the lower-body/rep-type keyword lists
// in src/services/progression.service.ts.
const CORE_MUSCLE_GROUP_KEYWORDS = [
  'leg', 'quad', 'hamstring', 'glute', 'chest', 'back', 'full body', 'lat',
];
const ISOLATION_MUSCLE_GROUP_KEYWORDS = [
  'shoulder', 'delt', 'bicep', 'tricep', 'calf', 'calve', 'core', 'abs',
  'abdom', 'forearm', 'trap',
];

// Low end of each range (per product decision: undersuggest rather than
// discourage a first-timer with too heavy a number). Female uses the same
// numbers at -20%; an unspecified sex falls back to these (male) values as
// the neutral baseline, not an assumption that the user is male.
const BASE_MULTIPLIER: Record<'core' | 'isolation', number> = {
  core: 0.8,
  isolation: 0.2,
};
const FEMALE_ADJUSTMENT = 0.8; // -20%

// A Beginner-difficulty plan gets a further discount on top of the above —
// starting too heavy is what actually discourages a first-timer, more than
// a slightly-too-light first set does. Reps are untouched; only the weight
// estimate is notched down. Sourced from the session's plan.difficulty
// (WorkoutPlan.difficulty), not a user profile setting — see the session
// fetch in workout.controller.ts. Matched case-insensitively since it's a
// free-text-ish field set via three different entry points (Plan Builder
// input, AI chat, official seed data) rather than a hard DB enum.
const BEGINNER_ADJUSTMENT = 0.75; // -25%

// True bodyweight movements — you have to move your own bodyweight before
// any added load makes sense, so "0.8× bodyweight" (meant for loaded lifts
// like barbell rows) is the wrong starting suggestion here. Matched by name
// since there's no exercise catalog / loadType flag in the data model yet.
const BODYWEIGHT_EXERCISE_KEYWORDS = [
  'pull-up', 'pull up', 'pullup',
  'chin-up', 'chin up', 'chinup',
  'push-up', 'push up', 'pushup',
  'dip', // covers "Dips", "Ring Dips", "Bench Dips", etc.
  'muscle-up', 'muscle up', 'muscleup',
  'inverted row',
  'ring row', 'trx row', // TRX/ring rows — you lean back and pull your own bodyweight
  'pistol squat',
];

export function isBodyweightExercise(
  exerciseName?: string | null,
  catalogEntry?: ExerciseCatalogEntry | null
): boolean {
  if (catalogEntry) {
    return catalogEntry.loadConvention === 'BODYWEIGHT' || catalogEntry.loadConvention === 'BODYWEIGHT_LOADABLE';
  }
  if (!exerciseName) return false;
  const name = exerciseName.toLowerCase();
  return BODYWEIGHT_EXERCISE_KEYWORDS.some((kw) => name.includes(kw));
}

// Dumbbell weight is conventionally the number on ONE dumbbell — "curling
// 20s" means 20 in each hand, not 40 total — but the formula below has no
// notion of that; it estimates one overall working load the way a barbell
// number would read. Halve it for a dumbbell exercise so the estimate lands
// on the number you'd actually ask for at the rack, not double it.
const DUMBBELL_LOAD_FACTOR = 0.5;

// Matches "Dumbbell Curl", "DB Row", "Dumbbell RDL", etc. Not "db" as a bare
// substring (would false-positive on e.g. "Deadbug") — requires it as its
// own word.
const DUMBBELL_NAME_PATTERN = /\bdumbbell\b|\bdb\b/i;

export function isDumbbellExercise(
  exerciseName?: string | null,
  catalogEntry?: ExerciseCatalogEntry | null
): boolean {
  if (catalogEntry) {
    // Not every dumbbell exercise is one-per-hand — a swing or goblet squat
    // uses a single dumbbell held with both hands (loadConvention TOTAL),
    // which the old name-only keyword check couldn't tell apart.
    return catalogEntry.equipment === 'DUMBBELL' && catalogEntry.loadConvention === 'PER_SIDE';
  }
  if (!exerciseName) return false;
  return DUMBBELL_NAME_PATTERN.test(exerciseName);
}

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
  const name = muscleGroup.toLowerCase();
  if (CORE_MUSCLE_GROUP_KEYWORDS.some((kw) => name.includes(kw))) return 'core';
  if (ISOLATION_MUSCLE_GROUP_KEYWORDS.some((kw) => name.includes(kw))) return 'isolation';
  return null; // Cardio, Recovery, Warm-up, or a genuinely unrecognized group
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
  exerciseName?: string | null;
  bodyweightKg?: number | null;
  /** WorkoutSession.plan?.difficulty — 'Beginner' notches the estimate down further. */
  planDifficulty?: string | null;
  /** Catalog match for exerciseName, if any — takes precedence over the muscleGroup/name keyword guesses below. */
  catalogEntry?: ExerciseCatalogEntry | null;
}

/**
 * Returns a rough starting-weight suggestion in kg, or null when there isn't
 * enough info to make one (no bodyweight logged yet, or the muscle group
 * doesn't map to a known category) — callers should fall back to a generic
 * placeholder in that case. For a true bodyweight exercise (pull-ups, dips,
 * push-ups...) this returns 0 — start with just bodyweight, no added load.
 * For a dumbbell exercise, the number is per dumbbell (see isDumbbellExercise) —
 * callers should label it as such so it doesn't read as a combined total.
 */
export function getDefaultStartingWeightKg({
  dateOfBirth,
  sex,
  muscleGroup,
  exerciseName,
  bodyweightKg,
  planDifficulty,
  catalogEntry,
}: DefaultWeightInput): number | null {
  if (isBodyweightExercise(exerciseName, catalogEntry)) return 0;

  if (!bodyweightKg || bodyweightKg <= 0) return null;

  // Catalog's movementPattern is authoritative when we have a match — more
  // reliable than the logged muscleGroup string, which can be missing or
  // inconsistently typed for the same exercise across sessions.
  const category = catalogEntry
    ? (catalogEntry.movementPattern === 'COMPOUND' ? 'core' : 'isolation')
    : (muscleGroup ? getCategory(muscleGroup) : null);
  if (!category) return null;

  const isBeginner = planDifficulty?.toLowerCase() === 'beginner';
  const base = BASE_MULTIPLIER[category]
    * (sex === 'FEMALE' ? FEMALE_ADJUSTMENT : 1)
    * (isBeginner ? BEGINNER_ADJUSTMENT : 1)
    * (isDumbbellExercise(exerciseName, catalogEntry) ? DUMBBELL_LOAD_FACTOR : 1);
  const age = dateOfBirth ? getAgeFromDateOfBirth(dateOfBirth) : BASELINE_AGE;
  const ageFactor = getAgeFactor(age);

  return Math.round(bodyweightKg * base * ageFactor * 100) / 100;
}
