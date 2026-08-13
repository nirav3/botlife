import { describe, it, expect } from 'vitest';
import { rampFallbackWeightsKg } from '@/lib/perSetRamp';

describe('rampFallbackWeightsKg', () => {
  it('positive: ramps ascending toward the target, last set hits it exactly', () => {
    const weights = rampFallbackWeightsKg(100, 3);

    expect(weights).toHaveLength(3);
    expect(weights[0]).toBeLessThan(weights[1]);
    expect(weights[1]).toBeLessThan(weights[2]);
    expect(weights[2]).toBe(100);
  });

  it('positive: a single set just returns the target with no ramp', () => {
    expect(rampFallbackWeightsKg(100, 1)).toEqual([100]);
  });

  it('negative: falls back to 3 sets when setCount is 0', () => {
    expect(rampFallbackWeightsKg(100, 0)).toHaveLength(3);
  });

  it('negative: clamps an unreasonable set count into a sane range', () => {
    expect(rampFallbackWeightsKg(100, 50).length).toBeLessThanOrEqual(6);
  });

  it('positive: values are never flat/identical across sets (the bug being fixed)', () => {
    const weights = rampFallbackWeightsKg(130, 4);
    const unique = new Set(weights);
    expect(unique.size).toBeGreaterThan(1);
  });
});
