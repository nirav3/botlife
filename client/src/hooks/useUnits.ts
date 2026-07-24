import { useAuth } from './useAuth';

// Conversion constants
const KG_TO_LB = 2.20462;
const LB_TO_KG = 1 / KG_TO_LB;
const KG_TO_LB_ROUND = 5; // nearest 5lb for progression suggestions
const CM_TO_IN = 0.393701;

export type WeightUnit = 'kg' | 'lb';

export interface UnitHelpers {
  /** User's preferred weight unit label */
  weightUnit: WeightUnit;

  /** Is the user in imperial mode? */
  isImperial: boolean;

  /**
   * Convert a stored kg value to display value in user's unit.
   * Returns the raw number — format with `formatWeight`.
   */
  kgToDisplay: (kg: number) => number;

  /**
   * Convert a display value (lb or kg) back to kg for storage.
   */
  displayToKg: (value: number) => number;

  /**
   * Format a stored kg value as a display string with unit label.
   * e.g.  83.9 → "185 lb"  or  83.9 → "83.9 kg"
   */
  formatWeight: (kg: number, opts?: { decimals?: number }) => string;

  /**
   * Format a raw display-unit value with label (no conversion).
   * Use this when the value is already in the display unit.
   */
  formatDisplayWeight: (value: number, opts?: { decimals?: number }) => string;

  /**
   * Round a display-unit weight to a sensible increment.
   * Imperial: nearest 2.5 lb | Metric: nearest 0.5 kg
   */
  roundToIncrement: (displayValue: number) => number;

  /**
   * Round a stored kg value to the nearest 5lb-equivalent — used for
   * suggested/placeholder weights (progression suggestions, warmup %) so
   * they land on a practical, plate-loadable number in either unit system.
   * Do not use this on real logged weights — only on suggestions.
   */
  roundSuggestedWeightKg: (kg: number) => number;

  /**
   * Placeholder text for weight inputs.
   */
  weightPlaceholder: string;

  /**
   * Step value for weight number inputs.
   */
  weightInputStep: string;

  /**
   * Parse a weight input string to kg for storage.
   * Returns null if the string is empty or invalid.
   */
  parseWeightInput: (raw: string) => number | null;
}

export function useUnits(): UnitHelpers {
  const { user } = useAuth();
  const isImperial = user?.unitSystem === 'IMPERIAL';
  const weightUnit: WeightUnit = isImperial ? 'lb' : 'kg';

  const kgToDisplay = (kg: number): number => {
    if (!isImperial) return kg;
    return Math.round(kg * KG_TO_LB * 10) / 10; // 1 decimal place in lb
  };

  const displayToKg = (value: number): number => {
    if (!isImperial) return value;
    return Math.round(value * LB_TO_KG * 1000) / 1000; // store with 3 decimal precision
  };

  const formatWeight = (kg: number, { decimals }: { decimals?: number } = {}): string => {
    const val = kgToDisplay(kg);
    const d = decimals ?? (isImperial ? 0 : 1);
    return `${val.toFixed(d)} ${weightUnit}`;
  };

  const formatDisplayWeight = (value: number, { decimals }: { decimals?: number } = {}): string => {
    const d = decimals ?? (isImperial ? 0 : 1);
    return `${value.toFixed(d)} ${weightUnit}`;
  };

  const roundToIncrement = (displayValue: number): number => {
    if (isImperial) {
      // Round to nearest 2.5 lb
      return Math.round(displayValue / 2.5) * 2.5;
    }
    // Round to nearest 0.5 kg
    return Math.round(displayValue / 0.5) * 0.5;
  };

  const weightPlaceholder = isImperial ? '185' : '83.5';
  const weightInputStep = isImperial ? '2.5' : '0.5';

  const roundSuggestedWeightKg = (kg: number): number => {
    const roundedLb = Math.round((kg * KG_TO_LB) / KG_TO_LB_ROUND) * KG_TO_LB_ROUND;
    return roundedLb * LB_TO_KG;
  };

  const parseWeightInput = (raw: string): number | null => {
    const val = parseFloat(raw);
    if (isNaN(val) || val <= 0) return null;
    return displayToKg(val);
  };

  return {
    weightUnit,
    isImperial,
    kgToDisplay,
    displayToKg,
    formatWeight,
    formatDisplayWeight,
    roundToIncrement,
    roundSuggestedWeightKg,
    weightPlaceholder,
    weightInputStep,
    parseWeightInput,
  };
}

// ── Standalone helpers (usable outside React) ─────────────────────────────────

export function kgToLb(kg: number, decimals = 1): number {
  return Math.round(kg * KG_TO_LB * 10 ** decimals) / 10 ** decimals;
}

export function lbToKg(lb: number, decimals = 3): number {
  return Math.round(lb * LB_TO_KG * 10 ** decimals) / 10 ** decimals;
}

// Nearest common barbell plate increment in lb (2.5lb plates)
export function nearestPlate(lb: number): number {
  return Math.round(lb / 2.5) * 2.5;
}

// unused but exported for potential future use
export { CM_TO_IN, KG_TO_LB_ROUND };
