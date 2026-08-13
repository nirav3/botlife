// ── Auth ──────────────────────────────────────────────────────────────────────
export type UnitSystem = 'METRIC' | 'IMPERIAL';
export type Sex = 'MALE' | 'FEMALE';

export interface User {
  id: string;
  email: string;
  name: string;
  unitSystem: UnitSystem;
  createdAt: string;
  // Optional — used only to estimate a starting weight for exercises with
  // no logged history yet. Never required to use the app.
  dateOfBirth?: string | null;
  sex?: Sex | null;
  onboardingSkipped?: boolean;
  googleId?: string | null;
}

export interface AuthResponse {
  data: { user: User; token: string };
}

// ── Weight ────────────────────────────────────────────────────────────────────
export interface WeightEntry {
  id: string;
  userId: string;
  weightKg: number;
  note: string | null;
  loggedAt: string;
  createdAt: string;
}

export interface WeightStats {
  current: number;
  starting: number;
  min: number;
  max: number;
  avg: number;
  totalChange: number;
  weeklyTrend: number | null;
  totalEntries: number;
}

// ── Workouts ──────────────────────────────────────────────────────────────────
export interface ExerciseSet {
  id: string;
  exerciseLogId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationSecs: number | null;
  rpe: number | null;
  isWarmup: boolean;
  completedAt: string;
}

export interface ExerciseLog {
  id: string;
  workoutSessionId: string;
  exerciseName: string;
  muscleGroup: string | null;
  orderIndex: number;
  notes: string | null;
  sets: ExerciseSet[];
}

export interface WorkoutSession {
  id: string;
  userId: string;
  name: string;
  notes: string | null;
  planId: string | null;
  dayNumber: number | null;
  startedAt: string;
  endedAt: string | null;
  exerciseLogs: ExerciseLog[];
  /**
   * Only populated by GET /api/workouts/:id (the single-session detail
   * fetch) — used to notch down the no-history starting-weight estimate for
   * Beginner plans. Undefined on the list/create/update endpoints, which
   * don't join the plan; treat missing the same as null (no plan / unknown).
   */
  plan?: { difficulty: string | null } | null;
}

// ── Progression ───────────────────────────────────────────────────────────────
export type ProgressionType = 'weight' | 'reps';

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
  readyForProgression: boolean;
  /** kg-denominated plain-English text — prefer reasonKey/reasonParams in the UI, see progressionReason.ts */
  reason: string;
  reasonKey: ProgressionReasonKey;
  reasonParams: ProgressionReasonParams;
  perSetSuggestions: SetSuggestion[];
}

export interface ProgressionOverview {
  ready: ProgressionSuggestion[];
  inProgress: ProgressionSuggestion[];
  total: number;
}

// ── Exercise Catalog ─────────────────────────────────────────────────────────
export type ExerciseBodyRegion = 'UPPER' | 'LOWER' | 'FULL_BODY';
export type ExerciseMovementPattern = 'COMPOUND' | 'ISOLATION';
export type ExerciseEquipment =
  | 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'KETTLEBELL' | 'BODYWEIGHT' | 'BAND' | 'OTHER';
export type ExerciseLoadConvention =
  | 'TOTAL' | 'PER_SIDE' | 'BODYWEIGHT' | 'BODYWEIGHT_LOADABLE' | 'TIME';
export type ExerciseProgressionType = 'WEIGHT' | 'REPS';

/**
 * Structured facts about a known exercise — not exhaustive, an exercise
 * with no matching catalog row just falls back to keyword-based
 * classification (see client/src/lib/defaultWeight.ts).
 */
export interface ExerciseCatalogEntry {
  id: string;
  name: string;
  aliases: string[];
  muscleGroup: string;
  bodyRegion: ExerciseBodyRegion;
  movementPattern: ExerciseMovementPattern;
  equipment: ExerciseEquipment;
  loadConvention: ExerciseLoadConvention;
  progressionType: ExerciseProgressionType | null;
}

export interface ExerciseHistory {
  sessionDate: string;
  weightKg: number;
  totalReps: number;
  avgRepsPerSet: number;
  sets: number;
}

// ── Workout Plans ─────────────────────────────────────────────────────────────
export interface PlannedSet {
  setNumber: number;
  targetReps: string;
  rpe?: number;
  isWarmup?: boolean;
}

export interface PlannedExercise {
  name: string;
  muscleGroup: string;
  sets: PlannedSet[];
  notes?: string;
}

export interface PlanDay {
  dayNumber: number;
  label: string;
  sessionName: string;
  exercises: PlannedExercise[];
}

export interface WorkoutPlanSummary {
  id: string;
  ownerId: string | null; // null = official/sample plan; otherwise the creator's user id
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  goal: 'Strength' | 'Hypertrophy' | 'Fat Loss' | 'General Fitness';
  daysPerWeek: number;
  estimatedMinutes: number;
  tags: string[];
}

export interface WorkoutPlan extends WorkoutPlanSummary {
  days: PlanDay[];
}

// The next day to do in whichever plan the user last started a session
// from — null when they haven't started any plan session yet.
export interface NextWorkout {
  planId: string;
  planName: string;
  dayNumber: number;
  label: string;
  sessionName: string;
}

// Input shape for create/update — no id/ownerId, freshly authored by the user
export interface WorkoutPlanInput {
  name: string;
  description?: string;
  difficulty?: string;
  goal?: string;
  daysPerWeek?: number;
  estimatedMinutes?: number;
  tags?: string[];
  days: PlanDay[];
}

// ExerciseSet extended with optional targetReps from plan
export interface ExerciseSetWithTarget extends ExerciseSet {
  targetReps?: string | null;
}

// ── API helpers ───────────────────────────────────────────────────────────────
export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
