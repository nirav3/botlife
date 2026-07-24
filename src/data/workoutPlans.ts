// ─── Official workout plan seed data ─────────────────────────────────────────
// This is the source of truth for the 8 official/sample plans, inserted into
// the WorkoutPlan/PlanDay/PlanExercise/PlanSet tables at server boot by
// planSeed.service.ts (see ensurePlansSeeded). Not read live by the API —
// once seeded, plans.controller.ts serves everything from the DB, which is
// also where user-created plans live (same tables, distinguished by owner).

export interface PlannedSet {
  setNumber: number;
  targetReps: string;       // e.g. "5", "8-12", "AMRAP"
  rpe?: number;             // optional target RPE
  isWarmup?: boolean;
}

export interface PlannedExercise {
  name: string;
  muscleGroup: string;
  sets: PlannedSet[];
  notes?: string;
}

export interface PlanDay {
  dayNumber: number;        // 1-7
  label: string;            // e.g. "Day 1 — Push"
  sessionName: string;      // becomes WorkoutSession.name
  exercises: PlannedExercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  goal: 'Strength' | 'Hypertrophy' | 'Fat Loss' | 'General Fitness';
  daysPerWeek: number;
  estimatedMinutes: number;
  tags: string[];
  days: PlanDay[];
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export const WORKOUT_PLANS: WorkoutPlan[] = [

  // ── 1. Starting Strength (3-day full body) ──────────────────────────────
  {
    id: 'starting-strength',
    name: 'Starting Strength',
    description:
      'The classic 3-day beginner barbell program. Two alternating full-body sessions built around squat, press, and deadlift. Linear progression every session.',
    difficulty: 'Beginner',
    goal: 'Strength',
    daysPerWeek: 3,
    estimatedMinutes: 60,
    tags: ['Barbell', 'Full Body', 'Linear Progression'],
    days: [
      {
        dayNumber: 1,
        label: 'Day A',
        sessionName: 'Starting Strength — Day A',
        exercises: [
          { name: 'Squat', muscleGroup: 'Legs', notes: 'Add 5 lb each session', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '5', isWarmup: true }, { setNumber: 3, targetReps: '5' }, { setNumber: 4, targetReps: '5' }, { setNumber: 5, targetReps: '5' }] },
          { name: 'Bench Press', muscleGroup: 'Chest', notes: 'Add 5 lb each session', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '5' }, { setNumber: 3, targetReps: '5' }, { setNumber: 4, targetReps: '5' }] },
          { name: 'Deadlift', muscleGroup: 'Back', notes: 'Add 10 lb each session — 1 heavy work set', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '5' }] },
        ],
      },
      {
        dayNumber: 2,
        label: 'Day B',
        sessionName: 'Starting Strength — Day B',
        exercises: [
          { name: 'Squat', muscleGroup: 'Legs', notes: 'Add 5 lb each session', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '5', isWarmup: true }, { setNumber: 3, targetReps: '5' }, { setNumber: 4, targetReps: '5' }, { setNumber: 5, targetReps: '5' }] },
          { name: 'Overhead Press', muscleGroup: 'Shoulders', notes: 'Alternates with Bench Press', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '5' }, { setNumber: 3, targetReps: '5' }, { setNumber: 4, targetReps: '5' }] },
          { name: 'Deadlift', muscleGroup: 'Back', notes: 'Add 10 lb each session', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '5' }] },
        ],
      },
    ],
  },

  // ── 2. PPL — Push / Pull / Legs (6-day) ────────────────────────────────
  {
    id: 'ppl-6day',
    name: 'Push / Pull / Legs',
    description:
      '6-day hypertrophy split. Each muscle group trained twice a week with moderate volume and rep ranges targeting muscle growth.',
    difficulty: 'Intermediate',
    goal: 'Hypertrophy',
    daysPerWeek: 6,
    estimatedMinutes: 75,
    tags: ['Barbell', 'Dumbbell', 'Split', 'Hypertrophy'],
    days: [
      {
        dayNumber: 1,
        label: 'Day 1 — Push',
        sessionName: 'PPL — Push',
        exercises: [
          { name: 'Bench Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '8' }, { setNumber: 3, targetReps: '8' }, { setNumber: 4, targetReps: '8' }] },
          { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '8' }, { setNumber: 2, targetReps: '8' }, { setNumber: 3, targetReps: '8' }] },
          { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }] },
          { name: 'Lateral Raises', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '12-15' }, { setNumber: 2, targetReps: '12-15' }, { setNumber: 3, targetReps: '12-15' }] },
          { name: 'Tricep Pushdown', muscleGroup: 'Triceps', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Overhead Tricep Extension', muscleGroup: 'Triceps', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }] },
        ],
      },
      {
        dayNumber: 2,
        label: 'Day 2 — Pull',
        sessionName: 'PPL — Pull',
        exercises: [
          { name: 'Deadlift', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '5' }, { setNumber: 3, targetReps: '5' }] },
          { name: 'Barbell Row', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '8' }, { setNumber: 2, targetReps: '8' }, { setNumber: 3, targetReps: '8' }] },
          { name: 'Pull-ups', muscleGroup: 'Back', notes: 'Add weight when bodyweight is easy', sets: [{ setNumber: 1, targetReps: 'AMRAP' }, { setNumber: 2, targetReps: 'AMRAP' }, { setNumber: 3, targetReps: 'AMRAP' }] },
          { name: 'Face Pulls', muscleGroup: 'Rear Delts', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'Barbell Curl', muscleGroup: 'Biceps', sets: [{ setNumber: 1, targetReps: '10' }, { setNumber: 2, targetReps: '10' }, { setNumber: 3, targetReps: '10' }] },
          { name: 'Hammer Curl', muscleGroup: 'Biceps', sets: [{ setNumber: 1, targetReps: '10' }, { setNumber: 2, targetReps: '10' }] },
        ],
      },
      {
        dayNumber: 3,
        label: 'Day 3 — Legs',
        sessionName: 'PPL — Legs',
        exercises: [
          { name: 'Squat', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '8' }, { setNumber: 3, targetReps: '8' }, { setNumber: 4, targetReps: '8' }] },
          { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', sets: [{ setNumber: 1, targetReps: '10' }, { setNumber: 2, targetReps: '10' }, { setNumber: 3, targetReps: '10' }] },
          { name: 'Leg Press', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }] },
          { name: 'Leg Curl', muscleGroup: 'Hamstrings', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Calf Raise', muscleGroup: 'Calves', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }, { setNumber: 4, targetReps: '15' }] },
        ],
      },
      {
        dayNumber: 4,
        label: 'Day 4 — Push (repeat)',
        sessionName: 'PPL — Push (Volume)',
        exercises: [
          { name: 'Bench Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }, { setNumber: 4, targetReps: '10-12' }] },
          { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }] },
          { name: 'Dumbbell Fly', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '12-15' }, { setNumber: 2, targetReps: '12-15' }, { setNumber: 3, targetReps: '12-15' }] },
          { name: 'Lateral Raises', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'Tricep Pushdown', muscleGroup: 'Triceps', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
        ],
      },
      {
        dayNumber: 5,
        label: 'Day 5 — Pull (repeat)',
        sessionName: 'PPL — Pull (Volume)',
        exercises: [
          { name: 'Barbell Row', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }] },
          { name: 'Lat Pulldown', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Cable Row', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Face Pulls', muscleGroup: 'Rear Delts', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }] },
          { name: 'Barbell Curl', muscleGroup: 'Biceps', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
        ],
      },
      {
        dayNumber: 6,
        label: 'Day 6 — Legs (repeat)',
        sessionName: 'PPL — Legs (Volume)',
        exercises: [
          { name: 'Squat', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }, { setNumber: 4, targetReps: '10-12' }] },
          { name: 'Hack Squat', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }] },
          { name: 'Leg Extension', muscleGroup: 'Quads', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Calf Raise', muscleGroup: 'Calves', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
        ],
      },
    ],
  },

  // ── 3. Upper / Lower (4-day) ────────────────────────────────────────────
  {
    id: 'upper-lower-4day',
    name: 'Upper / Lower Split',
    description:
      '4-day split alternating upper and lower body. Balanced mix of strength and hypertrophy work. Great for intermediate lifters who want to train 4 days a week.',
    difficulty: 'Intermediate',
    goal: 'Hypertrophy',
    daysPerWeek: 4,
    estimatedMinutes: 70,
    tags: ['Barbell', 'Dumbbell', 'Split'],
    days: [
      {
        dayNumber: 1,
        label: 'Day 1 — Upper (Strength)',
        sessionName: 'Upper/Lower — Upper Strength',
        exercises: [
          { name: 'Bench Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '5' }, { setNumber: 3, targetReps: '5' }, { setNumber: 4, targetReps: '5' }] },
          { name: 'Barbell Row', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '5' }, { setNumber: 2, targetReps: '5' }, { setNumber: 3, targetReps: '5' }, { setNumber: 4, targetReps: '5' }] },
          { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '8' }, { setNumber: 2, targetReps: '8' }, { setNumber: 3, targetReps: '8' }] },
          { name: 'Pull-ups', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: 'AMRAP' }, { setNumber: 2, targetReps: 'AMRAP' }, { setNumber: 3, targetReps: 'AMRAP' }] },
          { name: 'Dumbbell Curl', muscleGroup: 'Biceps', sets: [{ setNumber: 1, targetReps: '10' }, { setNumber: 2, targetReps: '10' }] },
          { name: 'Skull Crushers', muscleGroup: 'Triceps', sets: [{ setNumber: 1, targetReps: '10' }, { setNumber: 2, targetReps: '10' }] },
        ],
      },
      {
        dayNumber: 2,
        label: 'Day 2 — Lower (Strength)',
        sessionName: 'Upper/Lower — Lower Strength',
        exercises: [
          { name: 'Squat', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '5' }, { setNumber: 3, targetReps: '5' }, { setNumber: 4, targetReps: '5' }] },
          { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', sets: [{ setNumber: 1, targetReps: '8' }, { setNumber: 2, targetReps: '8' }, { setNumber: 3, targetReps: '8' }] },
          { name: 'Leg Press', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '10' }, { setNumber: 2, targetReps: '10' }, { setNumber: 3, targetReps: '10' }] },
          { name: 'Leg Curl', muscleGroup: 'Hamstrings', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }] },
          { name: 'Calf Raise', muscleGroup: 'Calves', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
        ],
      },
      {
        dayNumber: 3,
        label: 'Day 3 — Upper (Hypertrophy)',
        sessionName: 'Upper/Lower — Upper Hypertrophy',
        exercises: [
          { name: 'Incline Bench Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }, { setNumber: 4, targetReps: '10-12' }] },
          { name: 'Cable Row', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }] },
          { name: 'Dumbbell Lateral Raises', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'Lat Pulldown', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Barbell Curl', muscleGroup: 'Biceps', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Tricep Pushdown', muscleGroup: 'Triceps', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
        ],
      },
      {
        dayNumber: 4,
        label: 'Day 4 — Lower (Hypertrophy)',
        sessionName: 'Upper/Lower — Lower Hypertrophy',
        exercises: [
          { name: 'Squat', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }, { setNumber: 4, targetReps: '10-12' }] },
          { name: 'Leg Extension', muscleGroup: 'Quads', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'Leg Curl', muscleGroup: 'Hamstrings', sets: [{ setNumber: 1, targetReps: '12-15' }, { setNumber: 2, targetReps: '12-15' }, { setNumber: 3, targetReps: '12-15' }] },
          { name: 'Hip Thrust', muscleGroup: 'Glutes', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Calf Raise', muscleGroup: 'Calves', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }, { setNumber: 4, targetReps: '15' }] },
        ],
      },
    ],
  },

  // ── 4. Full Body 3x/week (Beginner) ─────────────────────────────────────
  {
    id: 'full-body-beginner',
    name: 'Full Body 3×/Week',
    description:
      'Simple 3-day full-body routine for beginners. Focuses on compound movements with enough volume to drive adaptation without overtraining.',
    difficulty: 'Beginner',
    goal: 'General Fitness',
    daysPerWeek: 3,
    estimatedMinutes: 50,
    tags: ['Barbell', 'Dumbbell', 'Full Body', 'Beginner Friendly'],
    days: [
      {
        dayNumber: 1,
        label: 'Day A',
        sessionName: 'Full Body — Day A',
        exercises: [
          { name: 'Squat', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '8-10' }, { setNumber: 2, targetReps: '8-10' }, { setNumber: 3, targetReps: '8-10' }] },
          { name: 'Bench Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '8-10' }, { setNumber: 2, targetReps: '8-10' }, { setNumber: 3, targetReps: '8-10' }] },
          { name: 'Barbell Row', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '8-10' }, { setNumber: 2, targetReps: '8-10' }, { setNumber: 3, targetReps: '8-10' }] },
          { name: 'Dumbbell Curl', muscleGroup: 'Biceps', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }] },
          { name: 'Tricep Pushdown', muscleGroup: 'Triceps', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }] },
        ],
      },
      {
        dayNumber: 2,
        label: 'Day B',
        sessionName: 'Full Body — Day B',
        exercises: [
          { name: 'Deadlift', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '6-8' }, { setNumber: 3, targetReps: '6-8' }] },
          { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '8-10' }, { setNumber: 2, targetReps: '8-10' }, { setNumber: 3, targetReps: '8-10' }] },
          { name: 'Lat Pulldown', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }] },
          { name: 'Leg Press', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }] },
          { name: 'Plank', muscleGroup: 'Core', notes: 'Hold for time', sets: [{ setNumber: 1, targetReps: '30-60s' }, { setNumber: 2, targetReps: '30-60s' }, { setNumber: 3, targetReps: '30-60s' }] },
        ],
      },
    ],
  },

  // ── 5. HIIT Circuit — Fat Loss (3-day) ──────────────────────────────────
  {
    id: 'hiit-circuit-fat-loss',
    name: 'HIIT Circuit — Fat Loss',
    description:
      '3-day full-body circuit program designed to maximize calorie burn. Short rest periods and compound supersets keep your heart rate elevated throughout. Log reps or use duration-based sets.',
    difficulty: 'Intermediate',
    goal: 'Fat Loss',
    daysPerWeek: 3,
    estimatedMinutes: 45,
    tags: ['Circuit', 'HIIT', 'Full Body', 'Fat Loss', 'Dumbbell'],
    days: [
      {
        dayNumber: 1,
        label: 'Day 1 — Total Body Circuit A',
        sessionName: 'HIIT Circuit — Total Body A',
        exercises: [
          { name: 'Goblet Squat', muscleGroup: 'Legs', notes: 'Rest 30s between sets', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }, { setNumber: 4, targetReps: '15' }] },
          { name: 'Dumbbell Romanian Deadlift', muscleGroup: 'Hamstrings', notes: 'Rest 30s between sets', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Dumbbell Push Press', muscleGroup: 'Shoulders', notes: 'Explosive concentric', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Dumbbell Row', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Burpees', muscleGroup: 'Full Body', notes: 'No weight — move fast', sets: [{ setNumber: 1, targetReps: '10' }, { setNumber: 2, targetReps: '10' }, { setNumber: 3, targetReps: '10' }] },
          { name: 'Mountain Climbers', muscleGroup: 'Core', notes: '30s on / 15s off', sets: [{ setNumber: 1, targetReps: '30s' }, { setNumber: 2, targetReps: '30s' }, { setNumber: 3, targetReps: '30s' }] },
        ],
      },
      {
        dayNumber: 2,
        label: 'Day 2 — Total Body Circuit B',
        sessionName: 'HIIT Circuit — Total Body B',
        exercises: [
          { name: 'Dumbbell Reverse Lunge', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '12 each leg' }, { setNumber: 2, targetReps: '12 each leg' }, { setNumber: 3, targetReps: '12 each leg' }] },
          { name: 'Dumbbell Deadlift', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Dumbbell Floor Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Renegade Row', muscleGroup: 'Back', notes: 'Core tight throughout', sets: [{ setNumber: 1, targetReps: '8 each side' }, { setNumber: 2, targetReps: '8 each side' }, { setNumber: 3, targetReps: '8 each side' }] },
          { name: 'Jump Squats', muscleGroup: 'Legs', notes: 'Bodyweight — land softly', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'Plank', muscleGroup: 'Core', sets: [{ setNumber: 1, targetReps: '45s' }, { setNumber: 2, targetReps: '45s' }, { setNumber: 3, targetReps: '45s' }] },
        ],
      },
      {
        dayNumber: 3,
        label: 'Day 3 — Total Body Circuit C',
        sessionName: 'HIIT Circuit — Total Body C',
        exercises: [
          { name: 'Dumbbell Sumo Squat', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'Dumbbell Swing', muscleGroup: 'Full Body', notes: 'Hinge at hips — not a squat', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }, { setNumber: 4, targetReps: '15' }] },
          { name: 'Dumbbell Arnold Press', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Dumbbell Chest-Supported Row', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Box Step-Ups', muscleGroup: 'Legs', notes: 'Add dumbbells when easy', sets: [{ setNumber: 1, targetReps: '10 each leg' }, { setNumber: 2, targetReps: '10 each leg' }, { setNumber: 3, targetReps: '10 each leg' }] },
          { name: 'Ab Wheel Rollout', muscleGroup: 'Core', sets: [{ setNumber: 1, targetReps: '10' }, { setNumber: 2, targetReps: '10' }, { setNumber: 3, targetReps: '10' }] },
        ],
      },
    ],
  },

  // ── 6. Metabolic Resistance Training — MRT (4-day) ──────────────────────
  {
    id: 'mrt-fat-loss',
    name: 'Metabolic Resistance Training',
    description:
      '4-day program combining heavy compound lifts with metabolic finishers. Preserves muscle while creating a large caloric deficit. Each session ends with a 10-minute finisher circuit.',
    difficulty: 'Intermediate',
    goal: 'Fat Loss',
    daysPerWeek: 4,
    estimatedMinutes: 60,
    tags: ['Barbell', 'Dumbbell', 'Fat Loss', 'Metabolic', 'Finisher'],
    days: [
      {
        dayNumber: 1,
        label: 'Day 1 — Lower Body + Finisher',
        sessionName: 'MRT — Lower Body',
        exercises: [
          { name: 'Squat', muscleGroup: 'Legs', notes: 'Heavier — rest 90s', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '6' }, { setNumber: 3, targetReps: '6' }, { setNumber: 4, targetReps: '6' }] },
          { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', sets: [{ setNumber: 1, targetReps: '10' }, { setNumber: 2, targetReps: '10' }, { setNumber: 3, targetReps: '10' }] },
          { name: 'Walking Lunge', muscleGroup: 'Legs', notes: 'Dumbbells — rest 60s', sets: [{ setNumber: 1, targetReps: '12 each leg' }, { setNumber: 2, targetReps: '12 each leg' }, { setNumber: 3, targetReps: '12 each leg' }] },
          { name: 'Leg Curl', muscleGroup: 'Hamstrings', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Calf Raise', muscleGroup: 'Calves', sets: [{ setNumber: 1, targetReps: '20' }, { setNumber: 2, targetReps: '20' }, { setNumber: 3, targetReps: '20' }] },
          { name: 'Finisher: Goblet Squat', muscleGroup: 'Legs', notes: '10-min AMRAP — light weight, rest as needed', sets: [{ setNumber: 1, targetReps: 'AMRAP 10 min' }] },
        ],
      },
      {
        dayNumber: 2,
        label: 'Day 2 — Upper Push + Finisher',
        sessionName: 'MRT — Upper Push',
        exercises: [
          { name: 'Bench Press', muscleGroup: 'Chest', notes: 'Heavier — rest 90s', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '6' }, { setNumber: 3, targetReps: '6' }, { setNumber: 4, targetReps: '6' }] },
          { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '10-12' }, { setNumber: 2, targetReps: '10-12' }, { setNumber: 3, targetReps: '10-12' }] },
          { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '10' }, { setNumber: 2, targetReps: '10' }, { setNumber: 3, targetReps: '10' }] },
          { name: 'Lateral Raises', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'Tricep Dips', muscleGroup: 'Triceps', notes: 'Bodyweight or weighted', sets: [{ setNumber: 1, targetReps: 'AMRAP' }, { setNumber: 2, targetReps: 'AMRAP' }, { setNumber: 3, targetReps: 'AMRAP' }] },
          { name: 'Finisher: Push Press + Burpee', muscleGroup: 'Full Body', notes: '5 push press → 5 burpees × 5 rounds, minimal rest', sets: [{ setNumber: 1, targetReps: '5 rounds' }] },
        ],
      },
      {
        dayNumber: 3,
        label: 'Day 3 — Upper Pull + Finisher',
        sessionName: 'MRT — Upper Pull',
        exercises: [
          { name: 'Deadlift', muscleGroup: 'Back', notes: 'Heavier — rest 2 min', sets: [{ setNumber: 1, targetReps: '5', isWarmup: true }, { setNumber: 2, targetReps: '5' }, { setNumber: 3, targetReps: '5' }] },
          { name: 'Barbell Row', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '8' }, { setNumber: 2, targetReps: '8' }, { setNumber: 3, targetReps: '8' }] },
          { name: 'Pull-ups', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: 'AMRAP' }, { setNumber: 2, targetReps: 'AMRAP' }, { setNumber: 3, targetReps: 'AMRAP' }] },
          { name: 'Face Pulls', muscleGroup: 'Rear Delts', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'Dumbbell Curl', muscleGroup: 'Biceps', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Finisher: Dumbbell Row + Jump Squat', muscleGroup: 'Full Body', notes: '10 rows each arm → 10 jump squats × 4 rounds', sets: [{ setNumber: 1, targetReps: '4 rounds' }] },
        ],
      },
      {
        dayNumber: 4,
        label: 'Day 4 — Full Body + Finisher',
        sessionName: 'MRT — Full Body',
        exercises: [
          { name: 'Front Squat', muscleGroup: 'Legs', notes: 'Moderate weight — rest 60s', sets: [{ setNumber: 1, targetReps: '8' }, { setNumber: 2, targetReps: '8' }, { setNumber: 3, targetReps: '8' }] },
          { name: 'Dumbbell Push Press', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '10' }, { setNumber: 2, targetReps: '10' }, { setNumber: 3, targetReps: '10' }] },
          { name: 'Dumbbell Swing', muscleGroup: 'Full Body', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'TRX / Ring Row', muscleGroup: 'Back', notes: 'Adjust angle for difficulty', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Finisher: Assault Bike / Row', muscleGroup: 'Cardio', notes: '10s sprint / 20s rest × 10 rounds', sets: [{ setNumber: 1, targetReps: '10 rounds' }] },
        ],
      },
    ],
  },

  // ── 7. Cardio + Strength Hybrid — Fat Loss (5-day) ──────────────────────
  {
    id: 'cardio-strength-hybrid',
    name: 'Cardio + Strength Hybrid',
    description:
      '5-day plan alternating steady-state cardio sessions with full-body strength workouts. Designed for people who enjoy both the gym floor and the treadmill. Maximizes fat loss while maintaining muscle.',
    difficulty: 'Beginner',
    goal: 'Fat Loss',
    daysPerWeek: 5,
    estimatedMinutes: 50,
    tags: ['Cardio', 'Dumbbell', 'Fat Loss', 'Beginner Friendly', 'Hybrid'],
    days: [
      {
        dayNumber: 1,
        label: 'Day 1 — Strength Full Body',
        sessionName: 'Hybrid — Strength Full Body',
        exercises: [
          { name: 'Goblet Squat', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Dumbbell Romanian Deadlift', muscleGroup: 'Hamstrings', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Dumbbell Bench Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Dumbbell Row', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Plank', muscleGroup: 'Core', sets: [{ setNumber: 1, targetReps: '30-45s' }, { setNumber: 2, targetReps: '30-45s' }, { setNumber: 3, targetReps: '30-45s' }] },
        ],
      },
      {
        dayNumber: 2,
        label: 'Day 2 — Cardio (Steady State)',
        sessionName: 'Hybrid — Cardio Day',
        exercises: [
          { name: 'Treadmill / Outdoor Walk-Run', muscleGroup: 'Cardio', notes: '70-75% max HR — conversational pace', sets: [{ setNumber: 1, targetReps: '35-40 min' }] },
          { name: 'Foam Roll', muscleGroup: 'Recovery', notes: 'Quads, hamstrings, glutes, calves', sets: [{ setNumber: 1, targetReps: '5-10 min' }] },
        ],
      },
      {
        dayNumber: 3,
        label: 'Day 3 — Strength Lower Body',
        sessionName: 'Hybrid — Strength Lower Body',
        exercises: [
          { name: 'Dumbbell Squat', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }, { setNumber: 4, targetReps: '15' }] },
          { name: 'Dumbbell Reverse Lunge', muscleGroup: 'Legs', sets: [{ setNumber: 1, targetReps: '12 each leg' }, { setNumber: 2, targetReps: '12 each leg' }, { setNumber: 3, targetReps: '12 each leg' }] },
          { name: 'Hip Thrust', muscleGroup: 'Glutes', notes: 'Bodyweight or barbell', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'Leg Curl', muscleGroup: 'Hamstrings', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Calf Raise', muscleGroup: 'Calves', sets: [{ setNumber: 1, targetReps: '20' }, { setNumber: 2, targetReps: '20' }, { setNumber: 3, targetReps: '20' }] },
        ],
      },
      {
        dayNumber: 4,
        label: 'Day 4 — HIIT Cardio',
        sessionName: 'Hybrid — HIIT Cardio',
        exercises: [
          { name: 'Warm-up Jog / Bike', muscleGroup: 'Cardio', notes: 'Easy pace', sets: [{ setNumber: 1, targetReps: '5 min' }] },
          { name: 'Sprint Intervals', muscleGroup: 'Cardio', notes: '30s all-out / 90s walk × 8 rounds. Treadmill, bike, or outdoor.', sets: [{ setNumber: 1, targetReps: '8 rounds' }] },
          { name: 'Cool-down Walk', muscleGroup: 'Cardio', sets: [{ setNumber: 1, targetReps: '5 min' }] },
          { name: 'Dead Bug', muscleGroup: 'Core', notes: 'Slow and controlled', sets: [{ setNumber: 1, targetReps: '10 each side' }, { setNumber: 2, targetReps: '10 each side' }, { setNumber: 3, targetReps: '10 each side' }] },
        ],
      },
      {
        dayNumber: 5,
        label: 'Day 5 — Strength Upper Body',
        sessionName: 'Hybrid — Strength Upper Body',
        exercises: [
          { name: 'Dumbbell Overhead Press', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Lat Pulldown', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Dumbbell Incline Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Cable Row', muscleGroup: 'Back', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }, { setNumber: 3, targetReps: '12' }] },
          { name: 'Lateral Raises', muscleGroup: 'Shoulders', sets: [{ setNumber: 1, targetReps: '15' }, { setNumber: 2, targetReps: '15' }, { setNumber: 3, targetReps: '15' }] },
          { name: 'Dumbbell Curl', muscleGroup: 'Biceps', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }] },
          { name: 'Tricep Overhead Extension', muscleGroup: 'Triceps', sets: [{ setNumber: 1, targetReps: '12' }, { setNumber: 2, targetReps: '12' }] },
        ],
      },
    ],
  },

  // ── 8. Nirav's Workout (5-day split) ────────────────────────────────────
  {
    id: 'nirav-workout',
    name: "Nirav's Workout",
    description:
      '5-day split covering every muscle group: Chest & Triceps, Back & Biceps, Legs, Shoulders & Abs, and a Full Body/Accessory day. Each session opens with a dynamic warm-up.',
    difficulty: 'Intermediate',
    goal: 'Hypertrophy',
    daysPerWeek: 5,
    estimatedMinutes: 60,
    tags: ['Barbell', 'Dumbbell', 'Split', 'Custom'],
    days: [
      {
        dayNumber: 1,
        label: 'Day 1 — Chest & Triceps',
        sessionName: "Nirav's Workout — Chest & Triceps",
        exercises: [
          {
            name: 'Dynamic Stretching Warm-up',
            muscleGroup: 'Warm-up',
            notes: '5-10 minutes — arm circles, chest openers, shoulder rolls',
            sets: [{ setNumber: 1, targetReps: '5-10 min' }],
          },
          {
            name: 'Bench Press',
            muscleGroup: 'Chest',
            sets: [
              { setNumber: 1, targetReps: '8-10', isWarmup: true },
              { setNumber: 2, targetReps: '8-10' },
              { setNumber: 3, targetReps: '8-10' },
              { setNumber: 4, targetReps: '8-10' },
            ],
          },
          {
            name: 'Incline Dumbbell Press',
            muscleGroup: 'Chest',
            sets: [
              { setNumber: 1, targetReps: '10' },
              { setNumber: 2, targetReps: '10' },
              { setNumber: 3, targetReps: '10' },
            ],
          },
          {
            name: 'Chest Flyes',
            muscleGroup: 'Chest',
            sets: [
              { setNumber: 1, targetReps: '12' },
              { setNumber: 2, targetReps: '12' },
              { setNumber: 3, targetReps: '12' },
            ],
          },
          {
            name: 'Triceps Dips',
            muscleGroup: 'Triceps',
            notes: 'Add weight when bodyweight becomes easy',
            sets: [
              { setNumber: 1, targetReps: '10' },
              { setNumber: 2, targetReps: '10' },
              { setNumber: 3, targetReps: '10' },
            ],
          },
          {
            name: 'Triceps Pushdowns',
            muscleGroup: 'Triceps',
            sets: [
              { setNumber: 1, targetReps: '12' },
              { setNumber: 2, targetReps: '12' },
              { setNumber: 3, targetReps: '12' },
            ],
          },
        ],
      },
      {
        dayNumber: 2,
        label: 'Day 2 — Back & Biceps',
        sessionName: "Nirav's Workout — Back & Biceps",
        exercises: [
          {
            name: 'Dynamic Stretching Warm-up',
            muscleGroup: 'Warm-up',
            notes: '5-10 minutes — cat-cow, band pull-aparts, hip hinges',
            sets: [{ setNumber: 1, targetReps: '5-10 min' }],
          },
          {
            name: 'Pull-Ups',
            muscleGroup: 'Back',
            notes: 'Add weight when bodyweight is easy',
            sets: [
              { setNumber: 1, targetReps: '8' },
              { setNumber: 2, targetReps: '8' },
              { setNumber: 3, targetReps: '8' },
              { setNumber: 4, targetReps: '8' },
            ],
          },
          {
            name: 'Barbell Row',
            muscleGroup: 'Back',
            sets: [
              { setNumber: 1, targetReps: '10' },
              { setNumber: 2, targetReps: '10' },
              { setNumber: 3, targetReps: '10' },
            ],
          },
          {
            name: 'Lat Pulldown',
            muscleGroup: 'Back',
            sets: [
              { setNumber: 1, targetReps: '12' },
              { setNumber: 2, targetReps: '12' },
              { setNumber: 3, targetReps: '12' },
            ],
          },
          {
            name: 'Dumbbell Curl',
            muscleGroup: 'Biceps',
            sets: [
              { setNumber: 1, targetReps: '10' },
              { setNumber: 2, targetReps: '10' },
              { setNumber: 3, targetReps: '10' },
            ],
          },
          {
            name: 'Hammer Curl',
            muscleGroup: 'Biceps',
            sets: [
              { setNumber: 1, targetReps: '12' },
              { setNumber: 2, targetReps: '12' },
              { setNumber: 3, targetReps: '12' },
            ],
          },
        ],
      },
      {
        dayNumber: 3,
        label: 'Day 3 — Legs',
        sessionName: "Nirav's Workout — Legs",
        exercises: [
          {
            name: 'Dynamic Stretching Warm-up',
            muscleGroup: 'Warm-up',
            notes: '5-10 minutes — leg swings, hip circles, bodyweight squats',
            sets: [{ setNumber: 1, targetReps: '5-10 min' }],
          },
          {
            name: 'Squat',
            muscleGroup: 'Legs',
            sets: [
              { setNumber: 1, targetReps: '8-10', isWarmup: true },
              { setNumber: 2, targetReps: '8-10' },
              { setNumber: 3, targetReps: '8-10' },
              { setNumber: 4, targetReps: '8-10' },
            ],
          },
          {
            name: 'Leg Press',
            muscleGroup: 'Legs',
            sets: [
              { setNumber: 1, targetReps: '12' },
              { setNumber: 2, targetReps: '12' },
              { setNumber: 3, targetReps: '12' },
            ],
          },
          {
            name: 'Romanian Deadlift',
            muscleGroup: 'Hamstrings',
            sets: [
              { setNumber: 1, targetReps: '10' },
              { setNumber: 2, targetReps: '10' },
              { setNumber: 3, targetReps: '10' },
            ],
          },
          {
            name: 'Leg Extension',
            muscleGroup: 'Quads',
            sets: [
              { setNumber: 1, targetReps: '12' },
              { setNumber: 2, targetReps: '12' },
              { setNumber: 3, targetReps: '12' },
            ],
          },
          {
            name: 'Calf Raises',
            muscleGroup: 'Calves',
            sets: [
              { setNumber: 1, targetReps: '15' },
              { setNumber: 2, targetReps: '15' },
              { setNumber: 3, targetReps: '15' },
              { setNumber: 4, targetReps: '15' },
            ],
          },
        ],
      },
      {
        dayNumber: 4,
        label: 'Day 4 — Shoulders & Abs',
        sessionName: "Nirav's Workout — Shoulders & Abs",
        exercises: [
          {
            name: 'Dynamic Stretching Warm-up',
            muscleGroup: 'Warm-up',
            notes: '5-10 minutes — neck rolls, shoulder circles, trunk rotations',
            sets: [{ setNumber: 1, targetReps: '5-10 min' }],
          },
          {
            name: 'Overhead Press',
            muscleGroup: 'Shoulders',
            sets: [
              { setNumber: 1, targetReps: '8-10', isWarmup: true },
              { setNumber: 2, targetReps: '8-10' },
              { setNumber: 3, targetReps: '8-10' },
              { setNumber: 4, targetReps: '8-10' },
            ],
          },
          {
            name: 'Lateral Raises',
            muscleGroup: 'Shoulders',
            sets: [
              { setNumber: 1, targetReps: '12' },
              { setNumber: 2, targetReps: '12' },
              { setNumber: 3, targetReps: '12' },
            ],
          },
          {
            name: 'Rear Delt Flyes',
            muscleGroup: 'Rear Delts',
            sets: [
              { setNumber: 1, targetReps: '12' },
              { setNumber: 2, targetReps: '12' },
              { setNumber: 3, targetReps: '12' },
            ],
          },
          {
            name: 'Plank',
            muscleGroup: 'Core',
            sets: [
              { setNumber: 1, targetReps: '1 min' },
              { setNumber: 2, targetReps: '1 min' },
              { setNumber: 3, targetReps: '1 min' },
            ],
          },
          {
            name: 'Hanging Leg Raise',
            muscleGroup: 'Core',
            sets: [
              { setNumber: 1, targetReps: '12' },
              { setNumber: 2, targetReps: '12' },
              { setNumber: 3, targetReps: '12' },
            ],
          },
        ],
      },
      {
        dayNumber: 5,
        label: 'Day 5 — Full Body / Accessory',
        sessionName: "Nirav's Workout — Full Body & Accessory",
        exercises: [
          {
            name: 'Dynamic Stretching Warm-up',
            muscleGroup: 'Warm-up',
            notes: '5-10 minutes — full body mobility flow',
            sets: [{ setNumber: 1, targetReps: '5-10 min' }],
          },
          {
            name: 'Deadlift',
            muscleGroup: 'Back',
            sets: [
              { setNumber: 1, targetReps: '6-8', isWarmup: true },
              { setNumber: 2, targetReps: '6-8' },
              { setNumber: 3, targetReps: '6-8' },
              { setNumber: 4, targetReps: '6-8' },
            ],
          },
          {
            name: 'Pull-Ups / Chin-Ups',
            muscleGroup: 'Back',
            notes: 'Alternate grip each session',
            sets: [
              { setNumber: 1, targetReps: '8' },
              { setNumber: 2, targetReps: '8' },
              { setNumber: 3, targetReps: '8' },
            ],
          },
          {
            name: 'Push-Ups',
            muscleGroup: 'Chest',
            sets: [
              { setNumber: 1, targetReps: '15' },
              { setNumber: 2, targetReps: '15' },
              { setNumber: 3, targetReps: '15' },
            ],
          },
          {
            name: "Farmer's Walk",
            muscleGroup: 'Full Body',
            notes: 'Heavy dumbbells — maintain upright posture',
            sets: [
              { setNumber: 1, targetReps: '30s' },
              { setNumber: 2, targetReps: '30s' },
              { setNumber: 3, targetReps: '30s' },
            ],
          },
          {
            name: 'Face Pulls',
            muscleGroup: 'Rear Delts',
            sets: [
              { setNumber: 1, targetReps: '12' },
              { setNumber: 2, targetReps: '12' },
              { setNumber: 3, targetReps: '12' },
            ],
          },
        ],
      },
    ],
  },
];

