// ─── Exercise Catalog seed data ────────────────────────────────────────────
// Curated facts about common exercises, seeded into the ExerciseCatalog
// table (see prisma/schema.prisma) at boot by exerciseCatalogSeed.service.ts.
//
// Not exhaustive — anything not listed here (a custom or AI-generated
// exercise name) isn't broken, it just falls back to the keyword heuristics
// already in progression.service.ts / defaultWeight.ts. This file only
// needs to cover common exercises well, not every exercise that will ever
// be typed into the app.
//
// `loadConvention` is the field the old keyword-only approach got wrong most
// often: not every "Dumbbell ___" exercise is held one-in-each-hand. A
// swing or goblet squat uses ONE dumbbell/kettlebell held with both hands
// (TOTAL), not one per side — a plain `name.includes('dumbbell')` check
// can't tell those apart, this table can.

export type ExerciseBodyRegion = 'UPPER' | 'LOWER' | 'FULL_BODY';
export type ExerciseMovementPattern = 'COMPOUND' | 'ISOLATION';
export type ExerciseEquipment =
  | 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'KETTLEBELL' | 'BODYWEIGHT' | 'BAND' | 'OTHER';
export type ExerciseLoadConvention =
  | 'TOTAL'                // one number is the whole load (barbell, machine stack, cable stack, single kettlebell/dumbbell held two-handed)
  | 'PER_SIDE'             // one number is what's held in EACH hand (dumbbell curl, DB press, one-per-hand lunges/rows)
  | 'BODYWEIGHT'           // no added load — suggest 0, progress via reps
  | 'BODYWEIGHT_LOADABLE'  // bodyweight base, but a belt/vest/dumbbell can add load (weighted pull-up/dip)
  | 'TIME';                // duration-based (plank) — weight/reps don't cleanly apply
export type ExerciseProgressionType = 'WEIGHT' | 'REPS';

export interface ExerciseCatalogEntry {
  name: string;
  aliases: string[];
  muscleGroup: string;
  bodyRegion: ExerciseBodyRegion;
  movementPattern: ExerciseMovementPattern;
  equipment: ExerciseEquipment;
  loadConvention: ExerciseLoadConvention;
  /** Null only for TIME-based entries (planks, holds). */
  progressionType: ExerciseProgressionType | null;
}

export const EXERCISE_CATALOG: ExerciseCatalogEntry[] = [
  // ── Squat / quad-dominant lower body ──────────────────────────────────────
  { name: 'Barbell Back Squat', aliases: ['Back Squat', 'Squat', 'Barbell Squat'], muscleGroup: 'Quads', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Front Squat', aliases: ['Barbell Front Squat'], muscleGroup: 'Quads', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Hack Squat', aliases: [], muscleGroup: 'Quads', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'MACHINE', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Squat', aliases: ['DB Squat'], muscleGroup: 'Quads', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Sumo Squat', aliases: ['Sumo Squat', 'DB Sumo Squat'], muscleGroup: 'Glutes', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Goblet Squat', aliases: [], muscleGroup: 'Quads', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Bulgarian Split Squat', aliases: ['Rear Foot Elevated Split Squat', 'Dumbbell Bulgarian Split Squat'], muscleGroup: 'Quads', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Leg Press', aliases: [], muscleGroup: 'Quads', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'MACHINE', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Leg Extension', aliases: [], muscleGroup: 'Quads', bodyRegion: 'LOWER', movementPattern: 'ISOLATION', equipment: 'MACHINE', loadConvention: 'TOTAL', progressionType: 'REPS' },
  { name: 'Jump Squats', aliases: ['Jump Squat'], muscleGroup: 'Quads', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'BODYWEIGHT', loadConvention: 'BODYWEIGHT', progressionType: 'REPS' },

  // ── Hinge / posterior chain ────────────────────────────────────────────────
  { name: 'Deadlift', aliases: ['Barbell Deadlift', 'Conventional Deadlift'], muscleGroup: 'Hamstrings', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Sumo Deadlift', aliases: [], muscleGroup: 'Glutes', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Trap Bar Deadlift', aliases: ['Hex Bar Deadlift'], muscleGroup: 'Legs', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Romanian Deadlift', aliases: ['RDL', 'Barbell RDL'], muscleGroup: 'Hamstrings', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Deadlift', aliases: ['DB Deadlift'], muscleGroup: 'Hamstrings', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Romanian Deadlift', aliases: ['Dumbbell RDL', 'DB RDL'], muscleGroup: 'Hamstrings', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Good Morning', aliases: ['Barbell Good Morning'], muscleGroup: 'Hamstrings', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Hip Thrust', aliases: ['Barbell Hip Thrust'], muscleGroup: 'Glutes', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Leg Curl', aliases: ['Hamstring Curl', 'Lying Leg Curl', 'Seated Leg Curl'], muscleGroup: 'Hamstrings', bodyRegion: 'LOWER', movementPattern: 'ISOLATION', equipment: 'MACHINE', loadConvention: 'TOTAL', progressionType: 'REPS' },

  // ── Lunges / single-leg / step-ups ─────────────────────────────────────────
  { name: 'Walking Lunge', aliases: ['Walking Lunges'], muscleGroup: 'Quads', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'BODYWEIGHT', loadConvention: 'BODYWEIGHT', progressionType: 'REPS' },
  { name: 'Dumbbell Reverse Lunge', aliases: ['Dumbbell Reverse Lunges', 'DB Reverse Lunge', 'Reverse Lunge'], muscleGroup: 'Quadriceps', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Box Step-Ups', aliases: ['Box Step-Up', 'Step-Ups'], muscleGroup: 'Quads', bodyRegion: 'LOWER', movementPattern: 'COMPOUND', equipment: 'BODYWEIGHT', loadConvention: 'BODYWEIGHT', progressionType: 'REPS' },

  // ── Calves ──────────────────────────────────────────────────────────────
  { name: 'Calf Raise', aliases: ['Calf Raises', 'Standing Calf Raise', 'Seated Calf Raise'], muscleGroup: 'Calves', bodyRegion: 'LOWER', movementPattern: 'ISOLATION', equipment: 'MACHINE', loadConvention: 'TOTAL', progressionType: 'REPS' },

  // ── Chest ───────────────────────────────────────────────────────────────
  { name: 'Bench Press', aliases: ['Barbell Bench Press', 'Flat Bench Press'], muscleGroup: 'Chest', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Incline Bench Press', aliases: ['Barbell Incline Bench Press'], muscleGroup: 'Chest', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Decline Bench Press', aliases: [], muscleGroup: 'Chest', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Close-Grip Bench Press', aliases: [], muscleGroup: 'Triceps', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Bench Press', aliases: ['DB Bench Press'], muscleGroup: 'Chest', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Incline Dumbbell Press', aliases: ['Incline DB Press', 'Dumbbell Incline Press'], muscleGroup: 'Chest', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Floor Press', aliases: ['DB Floor Press'], muscleGroup: 'Chest', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Chest Flyes', aliases: ['Chest Fly', 'Dumbbell Fly', 'Dumbbell Flyes'], muscleGroup: 'Chest', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'REPS' },
  { name: 'Cable Crossover', aliases: ['Cable Fly', 'Cable Chest Fly'], muscleGroup: 'Chest', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'CABLE', loadConvention: 'TOTAL', progressionType: 'REPS' },
  { name: 'Machine Chest Press', aliases: [], muscleGroup: 'Chest', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'MACHINE', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Push-Ups', aliases: ['Push-Up', 'Pushups', 'Push Up', 'Push Ups'], muscleGroup: 'Chest', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'BODYWEIGHT', loadConvention: 'BODYWEIGHT_LOADABLE', progressionType: 'REPS' },

  // ── Back ────────────────────────────────────────────────────────────────
  { name: 'Barbell Row', aliases: ['Bent-Over Row', 'Bent Over Row', 'Bent-Over Barbell Row'], muscleGroup: 'Back', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'T-Bar Row', aliases: [], muscleGroup: 'Back', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'MACHINE', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Row', aliases: ['DB Row', 'One-Arm Dumbbell Row', 'Single-Arm Dumbbell Row'], muscleGroup: 'Back', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Chest-Supported Row', aliases: ['Chest-Supported Row'], muscleGroup: 'Back', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Cable Row', aliases: ['Seated Cable Row', 'Seated Row'], muscleGroup: 'Back', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'CABLE', loadConvention: 'TOTAL', progressionType: 'REPS' },
  { name: 'Lat Pulldown', aliases: ['Wide Grip Pulldown', 'Wide-Grip Lat Pulldown'], muscleGroup: 'Back', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'CABLE', loadConvention: 'TOTAL', progressionType: 'REPS' },
  { name: 'Pull-Ups', aliases: ['Pull-ups', 'Pull Ups', 'Pullups', 'Pull-Ups / Chin-Ups', 'Chin-Ups', 'Chin-ups'], muscleGroup: 'Back', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'BODYWEIGHT', loadConvention: 'BODYWEIGHT_LOADABLE', progressionType: 'REPS' },
  { name: 'TRX / Ring Row', aliases: ['TRX Row', 'Ring Row', 'Inverted Row'], muscleGroup: 'Back', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'BODYWEIGHT', loadConvention: 'BODYWEIGHT', progressionType: 'REPS' },
  { name: 'Face Pulls', aliases: ['Face Pull'], muscleGroup: 'Rear Delts', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'CABLE', loadConvention: 'TOTAL', progressionType: 'REPS' },
  { name: 'Rear Delt Flyes', aliases: ['Rear Delt Fly', 'Reverse Fly', 'Reverse Flyes'], muscleGroup: 'Rear Delts', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'REPS' },
  { name: 'Shrugs', aliases: ['Barbell Shrug', 'Dumbbell Shrug', 'Trap Shrug'], muscleGroup: 'Back', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'REPS' },

  // ── Shoulders ───────────────────────────────────────────────────────────
  { name: 'Overhead Press', aliases: ['Military Press', 'Barbell Overhead Press', 'Standing Press'], muscleGroup: 'Shoulders', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Overhead Press', aliases: ['DB Shoulder Press', 'Dumbbell Shoulder Press'], muscleGroup: 'Shoulders', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Arnold Press', aliases: ['Arnold Press'], muscleGroup: 'Shoulders', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Push Press', aliases: ['Push Press'], muscleGroup: 'Shoulders', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Upright Row', aliases: ['Barbell Upright Row'], muscleGroup: 'Shoulders', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'REPS' },
  { name: 'Lateral Raises', aliases: ['Lateral Raise', 'Side Lateral Raise', 'Dumbbell Lateral Raises', 'Dumbbell Lateral Raise'], muscleGroup: 'Shoulders', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'REPS' },
  { name: 'Front Raise', aliases: ['Front Raises', 'Dumbbell Front Raise'], muscleGroup: 'Shoulders', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'REPS' },

  // ── Arms ────────────────────────────────────────────────────────────────
  { name: 'Barbell Curl', aliases: ['Barbell Bicep Curl', 'EZ Bar Curl'], muscleGroup: 'Biceps', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'REPS' },
  { name: 'Dumbbell Curl', aliases: ['Dumbbell Bicep Curl', 'DB Curl', 'Bicep Curl'], muscleGroup: 'Biceps', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'REPS' },
  { name: 'Hammer Curl', aliases: ['Dumbbell Hammer Curl', 'Hammer Curls'], muscleGroup: 'Biceps', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'REPS' },
  { name: 'Preacher Curl', aliases: ['Preacher Curls'], muscleGroup: 'Biceps', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'REPS' },
  { name: 'Concentration Curl', aliases: [], muscleGroup: 'Biceps', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'REPS' },
  { name: 'Tricep Dips', aliases: ['Triceps Dips', 'Dips', 'Bench Dips', 'Ring Dips'], muscleGroup: 'Triceps', bodyRegion: 'UPPER', movementPattern: 'COMPOUND', equipment: 'BODYWEIGHT', loadConvention: 'BODYWEIGHT_LOADABLE', progressionType: 'REPS' },
  { name: 'Tricep Pushdown', aliases: ['Triceps Pushdowns', 'Tricep Pushdowns', 'Cable Pushdown'], muscleGroup: 'Triceps', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'CABLE', loadConvention: 'TOTAL', progressionType: 'REPS' },
  { name: 'Skull Crushers', aliases: ['Lying Tricep Extension', 'EZ Bar Skull Crusher'], muscleGroup: 'Triceps', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'BARBELL', loadConvention: 'TOTAL', progressionType: 'REPS' },
  { name: 'Overhead Tricep Extension', aliases: ['Tricep Overhead Extension', 'Overhead Triceps Extension'], muscleGroup: 'Triceps', bodyRegion: 'UPPER', movementPattern: 'ISOLATION', equipment: 'DUMBBELL', loadConvention: 'TOTAL', progressionType: 'REPS' },

  // ── Core ────────────────────────────────────────────────────────────────
  { name: 'Plank', aliases: ['Front Plank'], muscleGroup: 'Core', bodyRegion: 'FULL_BODY', movementPattern: 'ISOLATION', equipment: 'BODYWEIGHT', loadConvention: 'TIME', progressionType: null },
  { name: 'Hanging Leg Raise', aliases: ['Hanging Leg Raises'], muscleGroup: 'Abs', bodyRegion: 'FULL_BODY', movementPattern: 'ISOLATION', equipment: 'BODYWEIGHT', loadConvention: 'BODYWEIGHT', progressionType: 'REPS' },
  { name: 'Ab Wheel Rollout', aliases: ['Ab Rollout'], muscleGroup: 'Core', bodyRegion: 'FULL_BODY', movementPattern: 'COMPOUND', equipment: 'OTHER', loadConvention: 'BODYWEIGHT', progressionType: 'REPS' },
  { name: 'Dead Bug', aliases: ['Deadbug'], muscleGroup: 'Core', bodyRegion: 'FULL_BODY', movementPattern: 'ISOLATION', equipment: 'BODYWEIGHT', loadConvention: 'BODYWEIGHT', progressionType: 'REPS' },

  // ── Full-body / conditioning ────────────────────────────────────────────
  { name: 'Burpees', aliases: ['Burpee'], muscleGroup: 'Full Body', bodyRegion: 'FULL_BODY', movementPattern: 'COMPOUND', equipment: 'BODYWEIGHT', loadConvention: 'BODYWEIGHT', progressionType: 'REPS' },
  { name: 'Mountain Climbers', aliases: ['Mountain Climber'], muscleGroup: 'Core', bodyRegion: 'FULL_BODY', movementPattern: 'COMPOUND', equipment: 'BODYWEIGHT', loadConvention: 'BODYWEIGHT', progressionType: 'REPS' },
  { name: 'Renegade Row', aliases: ['Renegade Rows'], muscleGroup: 'Back', bodyRegion: 'FULL_BODY', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
  { name: 'Dumbbell Swing', aliases: ['DB Swing'], muscleGroup: 'Glutes', bodyRegion: 'FULL_BODY', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  // A real kettlebell swing is NOT a dumbbell exercise — kept as its own row
  // (not an alias of Dumbbell Swing above) so equipment stays accurate; the
  // "per dumbbell" UI label is gated on equipment === DUMBBELL specifically.
  { name: 'Kettlebell Swing', aliases: ['KB Swing'], muscleGroup: 'Glutes', bodyRegion: 'FULL_BODY', movementPattern: 'COMPOUND', equipment: 'KETTLEBELL', loadConvention: 'TOTAL', progressionType: 'WEIGHT' },
  { name: "Farmer's Carry", aliases: ['Farmers Carry', 'Farmer Carry'], muscleGroup: 'Full Body', bodyRegion: 'FULL_BODY', movementPattern: 'COMPOUND', equipment: 'DUMBBELL', loadConvention: 'PER_SIDE', progressionType: 'WEIGHT' },
];
