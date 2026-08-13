import { describe, it, expect } from 'vitest';
import { formatProgressionReason } from '@/lib/progressionReason';
import type { ProgressionReasonParams } from '@/types';
import { useUnits } from '@/hooks/useUnits';

// formatProgressionReason takes `units` (the return value of useUnits) as a
// plain argument rather than calling the hook itself, so it can be exercised
// directly with hand-built kg/lb helpers instead of rendering a component.
function unitsFor(isImperial: boolean): ReturnType<typeof useUnits> {
  const KG_TO_LB = 2.20462;
  return {
    weightUnit: isImperial ? 'lb' : 'kg',
    isImperial,
    kgToDisplay: (kg: number) => (isImperial ? kg * KG_TO_LB : kg),
    displayToKg: (v: number) => (isImperial ? v / KG_TO_LB : v),
    formatWeight: (kg: number, opts?: { decimals?: number }) => {
      const d = opts?.decimals ?? (isImperial ? 0 : 1);
      const val = isImperial ? kg * KG_TO_LB : kg;
      return `${val.toFixed(d)} ${isImperial ? 'lb' : 'kg'}`;
    },
    formatDisplayWeight: (value: number, opts?: { decimals?: number }) => {
      const d = opts?.decimals ?? (isImperial ? 0 : 1);
      return `${value.toFixed(d)} ${isImperial ? 'lb' : 'kg'}`;
    },
    roundToIncrement: (v: number) => v,
    weightPlaceholder: isImperial ? '185' : '83.5',
    weightInputStep: isImperial ? '2.5' : '0.5',
    roundSuggestedWeightKg: (kg: number) => kg,
    parseWeightInput: () => null,
    heightUnit: 'cm',
    cmToDisplay: (cm: number) => cm,
    displayToCm: (v: number) => v,
  } as unknown as ReturnType<typeof useUnits>;
}

const baseParams: ProgressionReasonParams = {
  currentWeightKg: 100,
  currentReps: 10,
  incrementKg: 2.5,
  consecutiveSessions: 3,
  sessionsNeeded: 2,
  repsThreshold: 10,
  nextRepTarget: 12,
};

describe('formatProgressionReason', () => {
  it('positive: renders weight_ready in kg for a metric user', () => {
    const text = formatProgressionReason('weight_ready', baseParams, unitsFor(false));
    expect(text).toContain('100.0 kg');
    expect(text).toContain('2.5 kg');
    expect(text).not.toMatch(/\blb\b/);
  });

  it('positive: renders weight_ready in lb (not kg) for an imperial user', () => {
    const text = formatProgressionReason('weight_ready', baseParams, unitsFor(true));
    // 100kg ≈ 220lb, 2.5kg ≈ 6lb — the point is it must be converted, not left as kg.
    expect(text).toContain('lb');
    expect(text).not.toContain('100 kg');
    expect(text).not.toContain('2.5 kg');
  });

  it('positive: reps_ready_bodyweight never mentions a weight (no unit to get wrong)', () => {
    const kgText = formatProgressionReason('reps_ready_bodyweight', baseParams, unitsFor(false));
    const lbText = formatProgressionReason('reps_ready_bodyweight', baseParams, unitsFor(true));
    expect(kgText).toBe(lbText);
    expect(kgText).toContain('bodyweight');
  });

  it('negative: every reasonKey produces unit-converted, non-empty text for an imperial user', () => {
    const keys: Array<Parameters<typeof formatProgressionReason>[0]> = [
      'weight_ready', 'weight_hold', 'weight_working',
      'reps_ready', 'reps_ready_bodyweight', 'reps_hold', 'reps_working',
    ];
    const imperial = unitsFor(true);
    for (const key of keys) {
      const text = formatProgressionReason(key, baseParams, imperial);
      expect(text.length).toBeGreaterThan(0);
      if (key !== 'reps_ready_bodyweight') {
        expect(text).not.toMatch(/\d+(\.\d+)?\s*kg\b/); // no leftover kg text for an lb user
      }
    }
  });
});
