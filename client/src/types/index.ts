// ── Auth ──────────────────────────────────────────────────────────────────────
export type UnitSystem = 'METRIC' | 'IMPERIAL';

export interface User {
  id: string;
  email: string;
  name: string;
  unitSystem: UnitSystem;
  createdAt: string;
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
  startedAt: string;
  endedAt: string | null;
  exerciseLogs: ExerciseLog[];
}

// ── Meals ─────────────────────────────────────────────────────────────────────
export interface FoodItem {
  id: string;
  mealId: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Meal {
  id: string;
  mealPlanId: string;
  name: string;
  loggedAt: string;
  foodItems: FoodItem[];
}

export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  targetCalories: number | null;
  targetProteinG: number | null;
  targetCarbsG: number | null;
  targetFatG: number | null;
  isActive: boolean;
  meals: Meal[];
}

export interface DailySummary {
  date: string;
  meals: Meal[];
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number };
  targets: { calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null } | null;
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
