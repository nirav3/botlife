import { prisma } from '../lib/prisma';

export interface ProgressionSuggestion {
  exerciseName: string;
  currentWeightKg: number;
  suggestedWeightKg: number;
  currentReps: number;
  suggestedReps: number | null;
  reason: string;
  readyForProgression: boolean;
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
  // If avg reps >= this, suggest increasing weight
  repsThresholdForWeightIncrease: 10,
  // Look back this many weeks for analysis
  analysisWindowWeeks: 6,
};

const LOWER_BODY_KEYWORDS = [
  'squat', 'deadlift', 'leg press', 'lunge', 'leg curl', 'leg extension',
  'hip thrust', 'romanian', 'rdl', 'calf raise', 'hack squat',
];

function isLowerBody(exerciseName: string): boolean {
  return LOWER_BODY_KEYWORDS.some((kw) =>
    exerciseName.toLowerCase().includes(kw)
  );
}

function getIncrement(exerciseName: string): number {
  return isLowerBody(exerciseName)
    ? PROGRESSION_CONFIG.lowerBodyIncrementKg
    : PROGRESSION_CONFIG.upperBodyIncrementKg;
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
 * Logic:
 * - Find the last N sessions for this exercise
 * - If the user has performed the same weight for `minSessionsBeforeIncrease`
 *   consecutive sessions AND avg reps >= repsThresholdForWeightIncrease → suggest weight increase
 * - If user hit target reps but not enough sessions → encourage consistency
 * - If user is still below target reps → suggest staying at current weight
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
  const increment = getIncrement(exerciseName);

  // Count consecutive sessions at the current weight
  let consecutiveAtWeight = 0;
  for (const entry of history) {
    if (entry.weightKg === currentWeight) {
      consecutiveAtWeight++;
    } else {
      break; // Stop at the first session with a different weight
    }
  }

  const hitRepsThreshold = currentAvgReps >= PROGRESSION_CONFIG.repsThresholdForWeightIncrease;
  const enoughSessions = consecutiveAtWeight >= PROGRESSION_CONFIG.minSessionsBeforeIncrease;

  if (hitRepsThreshold && enoughSessions) {
    return {
      exerciseName,
      currentWeightKg: currentWeight,
      suggestedWeightKg: parseFloat((currentWeight + increment).toFixed(2)),
      currentReps: Math.round(currentAvgReps),
      suggestedReps: PROGRESSION_CONFIG.targetRepsPerSet,
      readyForProgression: true,
      reason: `You've hit ${consecutiveAtWeight} sessions at ${currentWeight}kg averaging ${currentAvgReps} reps. Time to increase by ${increment}kg!`,
    };
  }

  if (hitRepsThreshold && !enoughSessions) {
    const sessionsNeeded = PROGRESSION_CONFIG.minSessionsBeforeIncrease - consecutiveAtWeight;
    return {
      exerciseName,
      currentWeightKg: currentWeight,
      suggestedWeightKg: parseFloat((currentWeight + increment).toFixed(2)),
      currentReps: Math.round(currentAvgReps),
      suggestedReps: null,
      readyForProgression: false,
      reason: `Great reps! Stay at ${currentWeight}kg for ${sessionsNeeded} more session(s) to confirm readiness, then increase by ${increment}kg.`,
    };
  }

  return {
    exerciseName,
    currentWeightKg: currentWeight,
    suggestedWeightKg: currentWeight,
    currentReps: Math.round(currentAvgReps),
    suggestedReps: PROGRESSION_CONFIG.repsThresholdForWeightIncrease,
    readyForProgression: false,
    reason: `Aim for ${PROGRESSION_CONFIG.repsThresholdForWeightIncrease}+ avg reps at ${currentWeight}kg before increasing. Currently averaging ${currentAvgReps} reps.`,
  };
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
