// Ascending weight ramp for sets with no target rep count to taper (a
// brand-new exercise with no logged history yet, so there's no reps target
// or progression type to work from — just a rough starting-point estimate
// from getDefaultStartingWeightKg). Mirrors the 'weight'-type ramp math in
// src/services/progression.service.ts (buildPerSetSuggestions) so a
// first-time exercise still gets incrementing sets instead of one flat
// number repeated on every row, same as an exercise with real history.
export function rampFallbackWeightsKg(targetWeightKg: number, setCount: number): number[] {
  const n = Math.max(1, Math.min(setCount || 3, 6));
  const rampStepPct = 0.07; // 7% lighter per set back from the top
  const minFraction = 0.7;
  const weights: number[] = [];
  for (let i = 1; i <= n; i++) {
    const stepsFromTop = n - i;
    const fraction = Math.max(minFraction, 1 - stepsFromTop * rampStepPct);
    weights.push(targetWeightKg * fraction);
  }
  return weights;
}
