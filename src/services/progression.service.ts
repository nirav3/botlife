import { prisma } from '../lib/prisma';
import { getExerciseCatalogEntry } from './exerciseCatalog.service';

/**
 * How an exercise should be progressed over time:
 * - 'weight': add load session over session, reps held at a fixed target
 *   (compound barbell/machine lifts — small weight jumps are meaningful).
 * - 'reps': hold weight fixed and add reps session over session, only
 *   bumping weight once a rep ceiling is sustained (isolation/cable/
 *   bodyweight movements — a weight jump is a big relative jump, or there's
 *   no fine-grained load to add at all).
 */
export type ProgressionType = 'weight' | 'reps';

/**
 * Which template `reason` was built from, plus the raw numbers behind it —
 * weights here are kg, same as everywhere else in this API. `reason` itself
 * is a plain-English sentence with literal "kg" in it (handy for API
 * consumers that don't do unit conversion, e.g. Swagger's "try it out" or a
 * non-JS client); a UI that respects the user's lb/kg preference should
 * build its own copy from `reasonKey` + `reasonParams` instead of parsing
 * `reason` as a string. See `client/src/lib/progressionReason.ts`.
 */
export type ProgressionReasonKey =
  | 'weight_ready'
  | 'weight_hold'
  | 'weight_working'
  | 'reps_ready'
  | 'reps_ready_bodyweight'
  | 'reps_hold'
  | 'reps_working';

export interface ProgressionReasonParams {
  currentWeightKg: number;
  currentReps: number;
  incrementKg?: number;
  consecutiveSessions?: number;
  sessionsNeeded?: number;
  repsThreshold?: number;
  nextRepTarget?: number;
}

/** A single working set's suggested weight/reps within one session. */
export interface SetSuggestion {
  setNumber: number;
  weightKg: number;
  reps: number;
}

export interface ProgressionSuggestion {
  exerciseName: string;
  progressionType: ProgressionType;
  currentWeightKg: number;
  suggestedWeightKg: number;
  currentReps: number;
  suggestedReps: number | null;
  /** kg-denominated plain-English text — see ProgressionReasonKey doc comment. */
  reason: string;
  reasonKey: ProgressionReasonKey;
  reasonParams: ProgressionReasonParams;
  readyForProgression: boolean;
  /** Per-set breakdown for today's session — not the same flat number for every set. */
  perSetSuggestions: SetSuggestion[];
}

export interface ExerciseHistory {
  sessionDate: Date;
  weightKg: number;
  totalReps: number;       // sum of all working set reps
  avgRepsPerSet: number;
  sets: number;
}

// ─── Config ────────────────────────────────────────────────────────────────────
const PROGRESSION_CONFIG = {
  // Minimum sessions at current weight before suggesting increase
  minSessionsBeforeIncrease: 3,
  // Upper body increment in kg (5lbs ≈ 2.5kg)
  upperBodyIncrementKg: 2.5,
  // Lower body increment in kg (10lbs ≈ 5kg)
  lowerBodyIncrementKg: 5,
  // Target reps to qualify — user should hit at least this many reps avg
  targetRepsPerSet: 8,
  // If avg reps >= this, suggest increasing weight ('weight'-type exercises)
  repsThresholdForWeightIncrease: 10,

  // 'reps'-type exercises progress by reps first: smaller weight bumps,
  // and a much higher rep ceiling before that bump is even offered.
  upperBodyRepTypeIncrementKg: 1.25,
  lowerBodyRepTypeIncrementKg: 2.5,
  repCeilingForWeightIncrease: 15,
  repProgressionStep: 2,

  // Look back this many weeks for analysis
  analysisWindowWeeks: 6,
};

const LOWER_BODY_KEYWORDS = [
  'squat', 'deadlift', 'leg press', 'lunge', 'leg curl', 'leg extension',
  'hip thrust', 'romanian', 'rdl', 'calf raise', 'hack squat',
];

// Exercises where reps (not weight) should be the thing that goes up first —
// isolation/cable/bodyweight movements where a weight-plate jump is either a
// large relative increase or isn't available at all (e.g. bodyweight-only).
const REP_PROGRESSION_KEYWORDS = [
  'push-up', 'push up', 'pull-up', 'pull up', 'chin-up', 'chin up', 'dip',
  'plank', 'curl', 'lateral raise', 'front raise', 'rear delt', 'fly', 'flye',
  'tricep', 'triceps', 'face pull', 'calf raise', 'leg extension', 'leg curl',
  'shrug', 'crunch', 'sit-up', 'sit up', 'cable', 'band', 'inverted row',
];

export function isLowerBody(exerciseName: string): boolean {
  // ExerciseCatalog first (structured fact, when the exercise is a known
  // one) — falls back to the keyword guess below only for exercises not in
  // the catalog (custom/AI-generated names), so an unmatched exercise
  // degrades gracefully instead of losing classification entirely.
  const catalogEntry = getExerciseCatalogEntry(exerciseName);
  if (catalogEntry) return catalogEntry.bodyRegion === 'LOWER';

  return LOWER_BODY_KEYWORDS.some((kw) =>
    exerciseName.toLowerCase().includes(kw)
  );
}

function getIncrement(exerciseName: string): number {
  return isLowerBody(exerciseName)
    ? PROGRESSION_CONFIG.lowerBodyIncrementKg
    : PROGRESSION_CONFIG.upperBodyIncrementKg;
}

function getRepTypeIncrement(exerciseName: string): number {
  return isLowerBody(exerciseName)
    ? PROGRESSION_CONFIG.lowerBodyRepTypeIncrementKg
    : PROGRESSION_CONFIG.upperBodyRepTypeIncrementKg;
}

/**
 * Classify whether an exercise should be progressed by adding weight
 * (reps held constant) or by adding reps (weight held constant).
 *
 * ExerciseCatalog is checked first for a known exercise's explicit
 * progressionType. Falls back to a keyword match against the free-text
 * exercise name — same as before — for anything not in the catalog
 * (custom/AI-generated exercise names) or whose catalog entry has no
 * progressionType (TIME-based movements like planks).
 */
export function getProgressionType(exerciseName: string): ProgressionType {
  const catalogEntry = getExerciseCatalogEntry(exerciseName);
  if (catalogEntry?.progressionType) {
    return catalogEntry.progressionType === 'WEIGHT' ? 'weight' : 'reps';
  }

  const name = exerciseName.toLowerCase();
  return REP_PROGRESSION_KEYWORDS.some((kw) => name.includes(kw)) ? 'reps' : 'weight';
}

function roundToStep(value: number, step: number): number {
  return parseFloat((Math.round(value / step) * step).toFixed(2));
}

/**
 * Plain-English, kg-denominated version of `reasonKey` + `reasonParams`.
 * Kept as a convenience for API consumers that don't do unit conversion —
 * see the `ProgressionReasonKey` doc comment for why UI code shouldn't
 * parse this string instead of using the structured fields.
 */
function buildReasonText(key: ProgressionReasonKey, p: ProgressionReasonParams): string {
  switch (key) {
    case 'weight_ready':
      return `You've hit ${p.consecutiveSessions} sessions at ${p.currentWeightKg}kg averaging ${p.currentReps} reps. Time to increase by ${p.incrementKg}kg!`;
    case 'weight_hold':
      return `Great reps! Stay at ${p.currentWeightKg}kg for ${p.sessionsNeeded} more session(s) to confirm readiness, then increase by ${p.incrementKg}kg.`;
    case 'weight_working':
      return `Aim for ${p.repsThreshold}+ avg reps at ${p.currentWeightKg}kg before increasing. Currently averaging ${p.currentReps} reps.`;
    case 'reps_ready':
      return `You've hit ${p.consecutiveSessions} sessions at ${p.currentWeightKg}kg averaging ${p.currentReps} reps. Time to add ${p.incrementKg}kg.`;
    case 'reps_ready_bodyweight':
      return `You've hit ${p.consecutiveSessions} sessions at bodyweight averaging ${p.currentReps} reps. Time to add a bit of extra load (weighted vest/belt) if you can.`;
    case 'reps_hold':
      return `Great reps! Stay at ${p.currentWeightKg}kg for ${p.sessionsNeeded} more session(s) to confirm readiness, then we'll add load.`;
    case 'reps_working':
      return `Weight stays at ${p.currentWeightKg}kg — aim for ${p.nextRepTarget} reps next session (currently averaging ${p.currentReps}).`;
  }
}

/**
 * Build today's per-set targets so the user isn't shown the same flat
 * number on every row.
 *
 * - 'weight' exercises ramp up: earlier working sets are a bit lighter,
 *   building to the full target weight on the final set(s), reps held
 *   constant at the target rep count.
 * - 'reps' exercises hold weight constant across all sets (that's the
 *   point) but taper the rep target slightly across sets to reflect
 *   natural fatigue, centered on the target rep count.
 */
export function buildPerSetSuggestions(
  progressionType: ProgressionType,
  targetWeightKg: number,
  targetReps: number,
  setCount: number
): SetSuggestion[] {
  const n = Math.max(1, Math.min(setCount || 3, 6));
  const reps = Math.max(1, Math.round(targetReps));
  const sets: SetSuggestion[] = [];

  if (progressionType === 'weight') {
    const rampStepPct = 0.07; // 7% lighter per set back from the top
    const minFraction = 0.7;
    for (let i = 1; i <= n; i++) {
      const stepsFromTop = n - i;
      const fraction = Math.max(minFraction, 1 - stepsFromTop * rampStepPct);
      sets.push({
        setNumber: i,
        weightKg: roundToStep(targetWeightKg * fraction, 0.5),
        reps,
      });
    }
    return sets;
  }

  // 'reps' type — weight flat, rep target tapers from first set to last.
  const maxSpread = n >= 3 ? 2 : n - 1; // no spread at all for a single set
  const mid = (n + 1) / 2;
  for (let i = 1; i <= n; i++) {
    const offset = n > 1 ? Math.round(((mid - i) / (n - 1)) * maxSpread) : 0;
    sets.push({
      setNumber: i,
      weightKg: roundToStep(targetWeightKg, 0.5),
      reps: Math.max(1, reps + offset),
    });
  }
  return sets;
}

/**
 * Fetch the last N sessions for a given exercise for a user.
 * Only working sets (not warmups) are considered.
 */
export async function getExerciseHistory(
  userId: string,
  exerciseName: string,
  limitSessions = 10
): Promise<ExerciseHistory[]> {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: 50, // Grab recent sessions to find matching exercise
    include: {
      exerciseLogs: {
        where: {
          exerciseName: { equals: exerciseName, mode: 'insensitive' },
        },
        include: {
          sets: {
            where: { isWarmup: false, weightKg: { not: null }, reps: { not: null } },
            orderBy: { setNumber: 'asc' },
          },
        },
      },
    },
  });

  const history: ExerciseHistory[] = [];

  for (const session of sessions) {
    for (const log of session.exerciseLogs) {
      const workingSets = log.sets.filter((s) => s.reps != null && s.weightKg != null);
      if (workingSets.length === 0) continue;

      // Use the most common / heaviest weight logged in this session
      const weights = workingSets.map((s) => s.weightKg!);
      const maxWeight = Math.max(...weights);

      const totalReps = workingSets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
      const avgRepsPerSet = totalReps / workingSets.length;

      history.push({
        sessionDate: session.startedAt,
        weightKg: maxWeight,
        totalReps,
        avgRepsPerSet: parseFloat(avgRepsPerSet.toFixed(1)),
        sets: workingSets.length,
      });

      if (history.length >= limitSessions) break;
    }
    if (history.length >= limitSessions) break;
  }

  return history;
}

/**
 * Generate a progressive overload suggestion for a specific exercise.
 *
 * Exercises are first classified as 'weight'-type or 'reps'-type (see
 * `getProgressionType`), then:
 *
 * 'weight'-type (e.g. squat, bench, deadlift, row):
 * - If the user has held the same weight for `minSessionsBeforeIncrease`
 *   consecutive sessions AND avg reps >= repsThresholdForWeightIncrease →
 *   suggest a weight increase, reps target reset to targetRepsPerSet.
 * - If reps target hit but not enough sessions yet → encourage consistency.
 * - Otherwise → stay at current weight, work toward the reps threshold.
 *
 * 'reps'-type (e.g. pull-ups, curls, cable/isolation work):
 * - Weight stays fixed session over session; the rep target climbs instead.
 * - Only once avg reps sustain a much higher ceiling
 *   (repCeilingForWeightIncrease) for `minSessionsBeforeIncrease` sessions
 *   does the suggestion bump weight (a smaller increment) and reset reps.
 *
 * Either way, the response also includes `perSetSuggestions` — a per-set
 * breakdown for today instead of one flat number repeated on every set.
 */
export async function getProgressionSuggestion(
  userId: string,
  exerciseName: string
): Promise<ProgressionSuggestion | null> {
  const history = await getExerciseHistory(userId, exerciseName, 10);

  if (history.length === 0) return null;

  const latest = history[0];
  const currentWeight = latest.weightKg;
  const currentAvgReps = latest.avgRepsPerSet;
  const setCount = latest.sets;
  const progressionType = getProgressionType(exerciseName);

  // Count consecutive sessions at the current weight
  let consecutiveAtWeight = 0;
  for (const entry of history) {
    if (entry.weightKg === currentWeight) {
      consecutiveAtWeight++;
    } else {
      break; // Stop at the first session with a different weight
    }
  }
  const enoughSessions = consecutiveAtWeight >= PROGRESSION_CONFIG.minSessionsBeforeIncrease;

  const finish = (
    suggestedWeightKg: number,
    suggestedReps: number | null,
    readyForProgression: boolean,
    reasonKey: ProgressionReasonKey,
    reasonParams: ProgressionReasonParams
  ): ProgressionSuggestion => ({
    exerciseName,
    progressionType,
    currentWeightKg: currentWeight,
    suggestedWeightKg,
    currentReps: Math.round(currentAvgReps),
    suggestedReps,
    readyForProgression,
    reason: buildReasonText(reasonKey, reasonParams),
    reasonKey,
    reasonParams,
    perSetSuggestions: buildPerSetSuggestions(
      progressionType,
      readyForProgression ? suggestedWeightKg : currentWeight,
      suggestedReps ?? Math.round(currentAvgReps),
      setCount
    ),
  });

  if (progressionType === 'reps') {
    const increment = getRepTypeIncrement(exerciseName);
    const hitCeiling = currentAvgReps >= PROGRESSION_CONFIG.repCeilingForWeightIncrease;

    if (hitCeiling && enoughSessions) {
      return finish(
        parseFloat((currentWeight + increment).toFixed(2)),
        PROGRESSION_CONFIG.targetRepsPerSet,
        true,
        currentWeight > 0 ? 'reps_ready' : 'reps_ready_bodyweight',
        {
          currentWeightKg: currentWeight,
          currentReps: currentAvgReps,
          incrementKg: increment,
          consecutiveSessions: consecutiveAtWeight,
        }
      );
    }

    if (hitCeiling && !enoughSessions) {
      const sessionsNeeded = PROGRESSION_CONFIG.minSessionsBeforeIncrease - consecutiveAtWeight;
      return finish(
        currentWeight,
        null,
        false,
        'reps_hold',
        { currentWeightKg: currentWeight, currentReps: currentAvgReps, sessionsNeeded }
      );
    }

    // Weight stays put — the rep target climbs instead.
    const nextRepTarget = Math.min(
      PROGRESSION_CONFIG.repCeilingForWeightIncrease,
      Math.round(currentAvgReps) + PROGRESSION_CONFIG.repProgressionStep
    );
    return finish(
      currentWeight,
      nextRepTarget,
      false,
      'reps_working',
      { currentWeightKg: currentWeight, currentReps: currentAvgReps, nextRepTarget }
    );
  }

  // progressionType === 'weight'
  const increment = getIncrement(exerciseName);
  const hitRepsThreshold = currentAvgReps >= PROGRESSION_CONFIG.repsThresholdForWeightIncrease;

  if (hitRepsThreshold && enoughSessions) {
    return finish(
      parseFloat((currentWeight + increment).toFixed(2)),
      PROGRESSION_CONFIG.targetRepsPerSet,
      true,
      'weight_ready',
      {
        currentWeightKg: currentWeight,
        currentReps: currentAvgReps,
        incrementKg: increment,
        consecutiveSessions: consecutiveAtWeight,
      }
    );
  }

  if (hitRepsThreshold && !enoughSessions) {
    const sessionsNeeded = PROGRESSION_CONFIG.minSessionsBeforeIncrease - consecutiveAtWeight;
    return finish(
      parseFloat((currentWeight + increment).toFixed(2)),
      null,
      false,
      'weight_hold',
      { currentWeightKg: currentWeight, currentReps: currentAvgReps, incrementKg: increment, sessionsNeeded }
    );
  }

  return finish(
    currentWeight,
    PROGRESSION_CONFIG.repsThresholdForWeightIncrease,
    false,
    'weight_working',
    {
      currentWeightKg: currentWeight,
      currentReps: currentAvgReps,
      repsThreshold: PROGRESSION_CONFIG.repsThresholdForWeightIncrease,
    }
  );
}

/**
 * Get progression suggestions for all exercises the user has done
 * in the past N weeks.
 */
export async function getAllProgressionSuggestions(
  userId: string,
  weeksBack = PROGRESSION_CONFIG.analysisWindowWeeks
): Promise<ProgressionSuggestion[]> {
  const since = new Date();
  since.setDate(since.getDate() - weeksBack * 7);

  // Find all unique exercise names the user has logged recently
  const logs = await prisma.exerciseLog.findMany({
    where: {
      workoutSession: {
        userId,
        startedAt: { gte: since },
      },
    },
    select: { exerciseName: true },
    distinct: ['exerciseName'],
  });

  const uniqueExercises = logs.map((l) => l.exerciseName);

  const suggestions = await Promise.all(
    uniqueExercises.map((name) => getProgressionSuggestion(userId, name))
  );

  return suggestions.filter((s): s is ProgressionSuggestion => s !== null);
}
