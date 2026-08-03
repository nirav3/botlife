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
}

// ── Progression ───────────────────────────────────────────────────────────────
export interface ProgressionSuggestion {
  exerciseName: string;
  currentWeightKg: number;
  suggestedWeightKg: number;
  currentReps: number;
  suggestedReps: number | null;
  readyForProgression: boolean;
  reason: string;
}

export interface ProgressionOverview {
  ready: ProgressionSuggestion[];
  inProgress: ProgressionSuggestion[];
  total: number;
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
