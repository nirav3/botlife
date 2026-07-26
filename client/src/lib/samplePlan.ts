import { dump } from 'js-yaml';
import type { ImportedPlan } from '@/lib/planImport';

// Minimal plan that touches every field the importer understands (parsePlanFile
// in planImport.ts), used to show users the expected shape before they import
// their own file.
export const SAMPLE_PLAN: ImportedPlan = {
  name: 'My Custom Plan',
  description: 'A simple example showing every field the importer understands',
  difficulty: 'Beginner',
  goal: 'Strength',
  daysPerWeek: 3,
  estimatedMinutes: 45,
  tags: ['Example'],
  days: [
    {
      dayNumber: 1,
      label: 'Day 1 — Full Body',
      sessionName: 'Full Body A',
      exercises: [
        {
          name: 'Barbell Squat',
          muscleGroup: 'Legs',
          notes: 'Keep chest up',
          sets: [
            { setNumber: 1, targetReps: '5', rpe: 8, isWarmup: false },
            { setNumber: 2, targetReps: '5', isWarmup: false },
          ],
        },
        {
          name: 'Bench Press',
          muscleGroup: 'Chest',
          sets: [{ setNumber: 1, targetReps: '8-12', isWarmup: false }],
        },
      ],
    },
  ],
};

export const SAMPLE_PLAN_JSON = JSON.stringify(SAMPLE_PLAN, null, 2);
export const SAMPLE_PLAN_YAML = dump(SAMPLE_PLAN);
