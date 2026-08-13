import type { ProgressionReasonKey, ProgressionReasonParams } from '@/types';
import type { useUnits } from '@/hooks/useUnits';

/**
 * Builds the human-readable progression explanation in the user's chosen
 * unit (kg or lb) from the API's structured `reasonKey` + `reasonParams`.
 *
 * The API's own `reason` field is always kg-denominated English text — it's
 * there for API consumers that don't do unit conversion (Swagger's "try it
 * out", a non-JS client), not for this UI. Every weight-bearing surface in
 * this app should call this instead of displaying `reason` directly or
 * regex-parsing "kg" out of it — that broke silently for imperial users
 * whenever the sentence wording changed.
 */
export function formatProgressionReason(
  key: ProgressionReasonKey,
  params: ProgressionReasonParams,
  units: ReturnType<typeof useUnits>
): string {
  const decimals = units.isImperial ? 0 : 1;
  const weight = (kg: number) => units.formatWeight(kg, { decimals });
  const increment = (kg: number) => {
    const displayDelta = units.kgToDisplay(kg);
    return `${displayDelta.toFixed(decimals)} ${units.weightUnit}`;
  };

  const p = params;

  switch (key) {
    case 'weight_ready':
      return `You've hit ${p.consecutiveSessions} sessions at ${weight(p.currentWeightKg)} averaging ${p.currentReps} reps. Time to increase by ${increment(p.incrementKg ?? 0)}!`;
    case 'weight_hold':
      return `Great reps! Stay at ${weight(p.currentWeightKg)} for ${p.sessionsNeeded} more session(s) to confirm readiness, then increase by ${increment(p.incrementKg ?? 0)}.`;
    case 'weight_working':
      return `Aim for ${p.repsThreshold}+ avg reps at ${weight(p.currentWeightKg)} before increasing. Currently averaging ${p.currentReps} reps.`;
    case 'reps_ready':
      return `You've hit ${p.consecutiveSessions} sessions at ${weight(p.currentWeightKg)} averaging ${p.currentReps} reps. Time to add ${increment(p.incrementKg ?? 0)}.`;
    case 'reps_ready_bodyweight':
      return `You've hit ${p.consecutiveSessions} sessions at bodyweight averaging ${p.currentReps} reps. Time to add a bit of extra load (weighted vest/belt) if you can.`;
    case 'reps_hold':
      return `Great reps! Stay at ${weight(p.currentWeightKg)} for ${p.sessionsNeeded} more session(s) to confirm readiness, then we'll add load.`;
    case 'reps_working':
      return `Weight stays at ${weight(p.currentWeightKg)} — aim for ${p.nextRepTarget} reps next session (currently averaging ${p.currentReps}).`;
  }
}
