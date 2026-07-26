import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnits } from '@/hooks/useUnits';

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }));

function setUser(unitSystem: 'METRIC' | 'IMPERIAL' | undefined) {
  mockUseAuth.mockReturnValue({ user: unitSystem ? { unitSystem } : null });
}

describe('useUnits: kgToDisplay', () => {
  it('positive: metric users see the raw kg value unchanged', () => {
    setUser('METRIC');
    const { result } = renderHook(() => useUnits());
    expect(result.current.kgToDisplay(83.9)).toBe(83.9);
  });

  it('negative: imperial users get an lb conversion, not raw kg', () => {
    setUser('IMPERIAL');
    const { result } = renderHook(() => useUnits());
    expect(result.current.kgToDisplay(83.9)).toBeCloseTo(185, 0);
  });

  it('negative: a zero weight converts to zero, not NaN or a crash', () => {
    setUser('IMPERIAL');
    const { result } = renderHook(() => useUnits());
    expect(result.current.kgToDisplay(0)).toBe(0);
  });

  it('negative: a user with no unitSystem set defaults to metric (safe fallback)', () => {
    setUser(undefined);
    const { result } = renderHook(() => useUnits());
    expect(result.current.weightUnit).toBe('kg');
    expect(result.current.kgToDisplay(50)).toBe(50);
  });
});

describe('useUnits: parseWeightInput', () => {
  it('positive: parses a valid numeric string into stored kg', () => {
    setUser('METRIC');
    const { result } = renderHook(() => useUnits());
    expect(result.current.parseWeightInput('83.5')).toBeCloseTo(83.5);
  });

  it('negative: an empty string returns null rather than 0 or NaN', () => {
    setUser('METRIC');
    const { result } = renderHook(() => useUnits());
    expect(result.current.parseWeightInput('')).toBeNull();
  });

  it('negative: a non-numeric string returns null', () => {
    setUser('METRIC');
    const { result } = renderHook(() => useUnits());
    expect(result.current.parseWeightInput('not-a-number')).toBeNull();
  });

  it('negative: zero or negative weights are rejected as null (never stored as an invalid body weight)', () => {
    setUser('METRIC');
    const { result } = renderHook(() => useUnits());
    expect(result.current.parseWeightInput('0')).toBeNull();
    expect(result.current.parseWeightInput('-10')).toBeNull();
  });
});

describe('useUnits: formatWeight', () => {
  it('positive: metric formats with 1 decimal and a "kg" suffix', () => {
    setUser('METRIC');
    const { result } = renderHook(() => useUnits());
    expect(result.current.formatWeight(83.94)).toBe('83.9 kg');
  });

  it('negative: imperial formats with 0 decimals and an "lb" suffix (not kg)', () => {
    setUser('IMPERIAL');
    const { result } = renderHook(() => useUnits());
    expect(result.current.formatWeight(83.9)).toMatch(/^\d+ lb$/);
  });

  it('negative: an explicit decimals option overrides the unit-based default', () => {
    setUser('METRIC');
    const { result } = renderHook(() => useUnits());
    expect(result.current.formatWeight(83.9, { decimals: 0 })).toBe('84 kg');
  });

  it('negative: negative stored weights still format without throwing (defensive, should never happen upstream)', () => {
    setUser('METRIC');
    const { result } = renderHook(() => useUnits());
    expect(() => result.current.formatWeight(-5)).not.toThrow();
  });
});
