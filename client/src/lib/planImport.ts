import { load as loadYaml } from 'js-yaml';

export interface ImportedSet {
  setNumber: number;
  targetReps: string;
  rpe?: number;
  isWarmup: boolean;
}

export interface ImportedExercise {
  name: string;
  muscleGroup: string;
  notes?: string;
  sets: ImportedSet[];
}

export interface ImportedDay {
  dayNumber: number;
  label: string;
  sessionName: string;
  exercises: ImportedExercise[];
}

export interface ImportedPlan {
  name: string;
  description?: string;
  difficulty?: string;
  goal?: string;
  daysPerWeek?: number;
  estimatedMinutes?: number;
  tags: string[];
  days: ImportedDay[];
}

/** Parses and normalizes a plan file (.json/.yaml/.yml) into a shape the plan builder form can prefill. */
export function parsePlanFile(text: string, filename: string): ImportedPlan {
  const isYaml = /\.ya?ml$/i.test(filename);

  let raw: unknown;
  try {
    raw = isYaml ? loadYaml(text) : JSON.parse(text);
  } catch (err) {
    throw new Error(`Couldn't parse ${isYaml ? 'YAML' : 'JSON'}: ${(err as Error).message}`);
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('File must contain a plan object');
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    throw new Error('Plan is missing a "name" field');
  }
  if (!Array.isArray(obj.days) || obj.days.length === 0) {
    throw new Error('Plan must have at least one day in "days"');
  }

  const days: ImportedDay[] = obj.days.map((dayRaw, dayIdx) => {
    const day = (dayRaw ?? {}) as Record<string, unknown>;
    const exercisesRaw = Array.isArray(day.exercises) ? day.exercises : [];
    const label = typeof day.label === 'string' && day.label ? day.label : `Day ${dayIdx + 1}`;

    const exercises: ImportedExercise[] = exercisesRaw.map((exRaw) => {
      const ex = (exRaw ?? {}) as Record<string, unknown>;
      const setsRaw = Array.isArray(ex.sets) && ex.sets.length ? ex.sets : [{}];

      const sets: ImportedSet[] = setsRaw.map((setRaw, setIdx) => {
        const s = (setRaw ?? {}) as Record<string, unknown>;
        return {
          setNumber: typeof s.setNumber === 'number' ? s.setNumber : setIdx + 1,
          targetReps: s.targetReps != null ? String(s.targetReps) : '',
          rpe: typeof s.rpe === 'number' ? s.rpe : undefined,
          isWarmup: !!s.isWarmup,
        };
      });

      return {
        name: typeof ex.name === 'string' ? ex.name : '',
        muscleGroup: typeof ex.muscleGroup === 'string' ? ex.muscleGroup : '',
        notes: typeof ex.notes === 'string' ? ex.notes : undefined,
        sets,
      };
    });

    return {
      dayNumber: typeof day.dayNumber === 'number' ? day.dayNumber : dayIdx + 1,
      label,
      sessionName: typeof day.sessionName === 'string' && day.sessionName ? day.sessionName : label,
      exercises: exercises.length ? exercises : [{ name: '', muscleGroup: '', sets: [{ setNumber: 1, targetReps: '', isWarmup: false }] }],
    };
  });

  return {
    name: obj.name,
    description: typeof obj.description === 'string' ? obj.description : undefined,
    difficulty: typeof obj.difficulty === 'string' ? obj.difficulty : undefined,
    goal: typeof obj.goal === 'string' ? obj.goal : undefined,
    daysPerWeek: typeof obj.daysPerWeek === 'number' ? obj.daysPerWeek : undefined,
    estimatedMinutes: typeof obj.estimatedMinutes === 'number' ? obj.estimatedMinutes : undefined,
    tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === 'string') : [],
    days,
  };
}
