import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { X } from 'lucide-react';
import { plansApi } from '@/api/plans';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ImportedPlan } from '@/lib/planImport';
import type { WorkoutPlanInput } from '@/types';
import toast from 'react-hot-toast';

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const GOALS = ['Strength', 'Hypertrophy', 'Fat Loss', 'General Fitness'];

interface SetForm {
  setNumber: number;
  targetReps: string;
  rpe: string;
  isWarmup: boolean;
}

interface ExerciseForm {
  name: string;
  muscleGroup: string;
  notes: string;
  sets: SetForm[];
}

interface DayForm {
  dayNumber: number;
  label: string;
  sessionName: string;
  exercises: ExerciseForm[];
}

function emptySet(setNumber: number): SetForm {
  return { setNumber, targetReps: '', rpe: '', isWarmup: false };
}

function emptyExercise(): ExerciseForm {
  return { name: '', muscleGroup: '', notes: '', sets: [emptySet(1)] };
}

function emptyDay(dayNumber: number): DayForm {
  return { dayNumber, label: `Day ${dayNumber}`, sessionName: '', exercises: [emptyExercise()] };
}

function extractErrorMessage(err: unknown, fallback: string): string {
  return axios.isAxiosError(err)
    ? (err.response?.data as { error?: string })?.error ?? fallback
    : fallback;
}

export default function PlanBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const importedPlan = (location.state as { importedPlan?: ImportedPlan } | null)?.importedPlan;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[0]);
  const [goal, setGoal] = useState(GOALS[0]);
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [days, setDays] = useState<DayForm[]>([emptyDay(1)]);

  const { data: existingPlan } = useQuery({
    queryKey: ['plan', id],
    queryFn: () => plansApi.get(id!),
    enabled: isEditing,
  });

  // Pre-fill the form once the existing plan loads (edit mode)
  useEffect(() => {
    if (!existingPlan) return;
    setName(existingPlan.name);
    setDescription(existingPlan.description ?? '');
    setDifficulty(existingPlan.difficulty ?? DIFFICULTIES[0]);
    setGoal(existingPlan.goal ?? GOALS[0]);
    setDaysPerWeek(existingPlan.daysPerWeek ? String(existingPlan.daysPerWeek) : '');
    setEstimatedMinutes(existingPlan.estimatedMinutes ? String(existingPlan.estimatedMinutes) : '');
    setTagsInput((existingPlan.tags ?? []).join(', '));
    setDays(
      existingPlan.days.map((day) => ({
        dayNumber: day.dayNumber,
        label: day.label,
        sessionName: day.sessionName,
        exercises: day.exercises.map((ex) => ({
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          notes: ex.notes ?? '',
          sets: ex.sets.map((s) => ({
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            rpe: s.rpe != null ? String(s.rpe) : '',
            isWarmup: s.isWarmup ?? false,
          })),
        })),
      }))
    );
  }, [existingPlan]);

  // Pre-fill the form from an imported JSON/YAML file (create mode only)
  useEffect(() => {
    if (!importedPlan || isEditing) return;
    setName(importedPlan.name);
    setDescription(importedPlan.description ?? '');
    setDifficulty(
      DIFFICULTIES.includes(importedPlan.difficulty ?? '') ? importedPlan.difficulty! : DIFFICULTIES[0]
    );
    setGoal(GOALS.includes(importedPlan.goal ?? '') ? importedPlan.goal! : GOALS[0]);
    setDaysPerWeek(importedPlan.daysPerWeek ? String(importedPlan.daysPerWeek) : '');
    setEstimatedMinutes(importedPlan.estimatedMinutes ? String(importedPlan.estimatedMinutes) : '');
    setTagsInput(importedPlan.tags.join(', '));
    setDays(
      importedPlan.days.map((day) => ({
        dayNumber: day.dayNumber,
        label: day.label,
        sessionName: day.sessionName,
        exercises: day.exercises.map((ex) => ({
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          notes: ex.notes ?? '',
          sets: ex.sets.map((s) => ({
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            rpe: s.rpe != null ? String(s.rpe) : '',
            isWarmup: s.isWarmup,
          })),
        })),
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedPlan, isEditing]);

  // ── Day/exercise/set editing helpers ─────────────────────────────────────
  const addDay = () => setDays((d) => [...d, emptyDay(d.length + 1)]);
  const removeDay = (dayIndex: number) =>
    setDays((d) => d.filter((_, i) => i !== dayIndex).map((day, i) => ({ ...day, dayNumber: i + 1 })));
  const updateDay = (dayIndex: number, patch: Partial<DayForm>) =>
    setDays((d) => d.map((day, i) => (i === dayIndex ? { ...day, ...patch } : day)));

  const addExercise = (dayIndex: number) =>
    setDays((d) =>
      d.map((day, i) => (i === dayIndex ? { ...day, exercises: [...day.exercises, emptyExercise()] } : day))
    );
  const removeExercise = (dayIndex: number, exIndex: number) =>
    setDays((d) =>
      d.map((day, i) =>
        i === dayIndex ? { ...day, exercises: day.exercises.filter((_, j) => j !== exIndex) } : day
      )
    );
  const updateExercise = (dayIndex: number, exIndex: number, patch: Partial<ExerciseForm>) =>
    setDays((d) =>
      d.map((day, i) =>
        i === dayIndex
          ? { ...day, exercises: day.exercises.map((ex, j) => (j === exIndex ? { ...ex, ...patch } : ex)) }
          : day
      )
    );

  const addSet = (dayIndex: number, exIndex: number) =>
    setDays((d) =>
      d.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((ex, j) =>
                j === exIndex ? { ...ex, sets: [...ex.sets, emptySet(ex.sets.length + 1)] } : ex
              ),
            }
          : day
      )
    );
  const removeSet = (dayIndex: number, exIndex: number, setIndex: number) =>
    setDays((d) =>
      d.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((ex, j) =>
                j === exIndex
                  ? { ...ex, sets: ex.sets.filter((_, k) => k !== setIndex).map((s, k) => ({ ...s, setNumber: k + 1 })) }
                  : ex
              ),
            }
          : day
      )
    );
  const updateSet = (dayIndex: number, exIndex: number, setIndex: number, patch: Partial<SetForm>) =>
    setDays((d) =>
      d.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((ex, j) =>
                j === exIndex
                  ? { ...ex, sets: ex.sets.map((s, k) => (k === setIndex ? { ...s, ...patch } : s)) }
                  : ex
              ),
            }
          : day
      )
    );

  // ── Save ──────────────────────────────────────────────────────────────────
  const buildPayload = (): WorkoutPlanInput => ({
    name,
    description: description || undefined,
    difficulty,
    goal,
    daysPerWeek: daysPerWeek ? parseInt(daysPerWeek) : undefined,
    estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
    tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    days: days.map((day) => ({
      dayNumber: day.dayNumber,
      label: day.label,
      sessionName: day.sessionName || day.label,
      exercises: day.exercises.map((ex) => ({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        notes: ex.notes || undefined,
        sets: ex.sets.map((s) => ({
          setNumber: s.setNumber,
          targetReps: s.targetReps,
          rpe: s.rpe ? parseFloat(s.rpe) : undefined,
          isWarmup: s.isWarmup,
        })),
      })),
    })),
  });

  const saveMutation = useMutation({
    mutationFn: () => (isEditing ? plansApi.update(id!, buildPayload()) : plansApi.create(buildPayload())),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success(isEditing ? 'Plan updated' : 'Plan created');
      navigate('/plans');
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Failed to save plan')),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Plan name is required'); return; }
    if (days.length === 0) { toast.error('Add at least one day'); return; }
    saveMutation.mutate();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate('/plans')} className="text-sm text-muted hover:text-ink mb-1">
          ← Back to plans
        </button>
        <h1 className="text-2xl font-bold text-ink">{isEditing ? 'Edit Plan' : 'Create a Plan'}</h1>
      </div>

      {importedPlan && !isEditing && (
        <div className="bg-accent-violet/10 border border-accent-violet/30 text-accent-violet text-sm rounded-lg px-4 py-2.5">
          Imported from file — review everything below before saving.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plan metadata */}
        <Card>
          <CardBody className="space-y-4">
            <Input label="Plan name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Custom Split" required autoFocus />
            <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short description of the program" />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/30 bg-surface text-ink"
                >
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink">Goal</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/30 bg-surface text-ink"
                >
                  {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Days per week" type="number" min="1" max="7" value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)} placeholder="4" />
              <Input label="Est. minutes / session" type="number" min="1" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} placeholder="60" />
            </div>
            <Input label="Tags (comma separated)" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Barbell, Split, Custom" />
          </CardBody>
        </Card>

        {/* Days */}
        <div className="space-y-4">
          {days.map((day, dayIndex) => (
            <Card key={dayIndex}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    <Input label="Day label" value={day.label} onChange={(e) => updateDay(dayIndex, { label: e.target.value })} placeholder="Day 1 — Push" />
                    <Input label="Session name" value={day.sessionName} onChange={(e) => updateDay(dayIndex, { sessionName: e.target.value })} placeholder="Push Day" />
                  </div>
                  {days.length > 1 && (
                    <button type="button" onClick={() => removeDay(dayIndex)} className="text-danger/60 hover:text-danger mt-6" aria-label="Remove day">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {day.exercises.map((ex, exIndex) => (
                  <div key={exIndex} className="border border-line rounded-xl p-4 space-y-3 bg-surface-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                        <Input label="Exercise" value={ex.name} onChange={(e) => updateExercise(dayIndex, exIndex, { name: e.target.value })} placeholder="Bench Press" />
                        <Input label="Muscle group" value={ex.muscleGroup} onChange={(e) => updateExercise(dayIndex, exIndex, { muscleGroup: e.target.value })} placeholder="Chest" />
                      </div>
                      {day.exercises.length > 1 && (
                        <button type="button" onClick={() => removeExercise(dayIndex, exIndex)} className="text-danger/60 hover:text-danger mt-6" aria-label="Remove exercise">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Input label="Notes (optional)" value={ex.notes} onChange={(e) => updateExercise(dayIndex, exIndex, { notes: e.target.value })} placeholder="Add weight when bodyweight is easy" />

                    <div className="space-y-2">
                      <p className="text-xs text-muted uppercase tracking-wide">Sets</p>
                      {ex.sets.map((s, setIndex) => (
                        <div key={setIndex} className="flex items-center gap-2">
                          <span className="text-xs text-muted w-6 shrink-0">{s.setNumber}</span>
                          <div className="flex-1 min-w-0">
                            <Input
                              value={s.targetReps}
                              onChange={(e) => updateSet(dayIndex, exIndex, setIndex, { targetReps: e.target.value })}
                              placeholder="8-12"
                            />
                          </div>
                          <div className="w-16 shrink-0">
                            <Input
                              type="number"
                              step="0.5"
                              value={s.rpe}
                              onChange={(e) => updateSet(dayIndex, exIndex, setIndex, { rpe: e.target.value })}
                              placeholder="RPE"
                            />
                          </div>
                          <label className="flex items-center gap-1 text-xs text-muted whitespace-nowrap shrink-0">
                            <input
                              type="checkbox"
                              checked={s.isWarmup}
                              onChange={(e) => updateSet(dayIndex, exIndex, setIndex, { isWarmup: e.target.checked })}
                              className="rounded"
                            />
                            Warmup
                          </label>
                          {ex.sets.length > 1 && (
                            <button type="button" onClick={() => removeSet(dayIndex, exIndex, setIndex)} className="text-danger/60 hover:text-danger shrink-0" aria-label="Remove set">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="ghost" size="sm" onClick={() => addSet(dayIndex, exIndex)}>
                        + Set
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => addExercise(dayIndex)}>
                  + Exercise
                </Button>
              </CardBody>
            </Card>
          ))}

          <Button type="button" variant="secondary" className="w-full" onClick={addDay}>
            + Add Day
          </Button>
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate('/plans')}>Cancel</Button>
          <Button type="submit" loading={saveMutation.isPending}>
            {isEditing ? 'Save changes' : 'Create plan'}
          </Button>
        </div>
      </form>
    </div>
  );
}
