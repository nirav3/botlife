import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import axios from 'axios';
import { Pencil, Rocket, Shuffle, Lightbulb, X } from 'lucide-react';
import { workoutsApi } from '@/api/workouts';
import { progressionApi } from '@/api/progression';
import { useUnits } from '@/hooks/useUnits';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { ExerciseLog, ExerciseSetWithTarget, ProgressionSuggestion } from '@/types';
import toast from 'react-hot-toast';

function extractErrorMessage(err: unknown, fallback: string): string {
  return axios.isAxiosError(err)
    ? (err.response?.data as { error?: string })?.error ?? fallback
    : fallback;
}

// ─── Inline editable cell ─────────────────────────────────────────────────────
// Renders as plain text; clicking it swaps to an <input> that saves on blur/Enter.

interface EditableCellProps {
  value: string;
  placeholder: string;
  inputType?: 'number';
  step?: string;
  onSave: (raw: string) => void;
  className?: string;
}

function EditableCell({ value, placeholder, inputType = 'number', step = 'any', onSave, className = '' }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when value changes externally (after save)
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  };

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={inputType}
        step={step}
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        className={`w-full rounded border border-accent-violet bg-surface text-ink px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent-violet/40 ${className}`}
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
      className={`w-full text-left rounded px-2 py-1 text-sm transition-colors hover:bg-surface-2 hover:text-accent-violet group ${
        value ? 'text-ink font-medium' : 'text-muted italic'
      } ${className}`}
    >
      {value || placeholder}
      <Pencil className="inline w-3 h-3 ml-1 opacity-0 group-hover:opacity-60 text-accent-violet" />
    </button>
  );
}

// ─── Progression badge for an exercise ───────────────────────────────────────
function ProgressionBadge({
  suggestion,
  units,
}: {
  suggestion: ProgressionSuggestion | undefined;
  units: ReturnType<typeof useUnits>;
}) {
  if (!suggestion) return null;

  const suggested = units.kgToDisplay(units.roundSuggestedWeightKg(suggestion.suggestedWeightKg));
  const decimals = units.isImperial ? 0 : 1;

  if (suggestion.readyForProgression) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-surface-2 text-accent-violet border border-line px-2 py-0.5 rounded-full font-medium">
        <Rocket className="w-3 h-3" /> Try {suggested.toFixed(decimals)} {units.weightUnit} today
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs bg-surface-2 text-muted border border-line px-2 py-0.5 rounded-full">
      Last: {units.formatWeight(suggestion.currentWeightKg)} × {suggestion.currentReps} reps
    </span>
  );
}

// ─── Exercise card with inline-editable sets ──────────────────────────────────
function ExerciseCard({
  log,
  sessionId,
  units,
}: {
  log: ExerciseLog;
  sessionId: string;
  units: ReturnType<typeof useUnits>;
}) {
  const qc = useQueryClient();
  const [addSetModal, setAddSetModal] = useState(false);
  const [setWeightDisplay, setSetWeightDisplay] = useState('');
  const [setReps, setSetReps] = useState('');
  const [setRpe, setSetRpe] = useState('');
  const [isWarmup, setIsWarmup] = useState(false);

  // Lazily fetch progression suggestion for this exercise
  const { data: suggestion } = useQuery({
    queryKey: ['progression-exercise', log.exerciseName],
    queryFn: () => progressionApi.forExercise(log.exerciseName),
    // Don't error-toast on 404 (no history yet)
    retry: false,
    throwOnError: false,
  });

  const updateSetMutation = useMutation({
    mutationFn: ({ setId, data }: { setId: string; data: { weightKg?: number; reps?: number } }) =>
      workoutsApi.updateSet(sessionId, log.id, setId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', sessionId] }),
    onError: () => toast.error('Failed to save'),
  });

  const deleteSetMutation = useMutation({
    mutationFn: (setId: string) => workoutsApi.deleteSet(sessionId, log.id, setId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', sessionId] }),
    onError: () => toast.error('Failed to delete set'),
  });

  const swapMutation = useMutation({
    mutationFn: () => workoutsApi.swapExercise(sessionId, log.id),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['workout', sessionId] });
      toast.success(`Swapped to ${updated.exerciseName}`);
    },
    onError: (err) => toast.error(extractErrorMessage(err, 'Could not swap exercise')),
  });

  const addSetMutation = useMutation({
    mutationFn: () => {
      const nextSetNumber = (log.sets[log.sets.length - 1]?.setNumber ?? 0) + 1;
      const weightKg = units.parseWeightInput(setWeightDisplay) ?? undefined;
      return workoutsApi.addSet(sessionId, log.id, {
        setNumber: nextSetNumber,
        weightKg,
        reps: setReps ? parseInt(setReps) : undefined,
        rpe: setRpe ? parseFloat(setRpe) : undefined,
        isWarmup,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', sessionId] });
      toast.success('Set added');
      setAddSetModal(false);
      setSetWeightDisplay(''); setSetReps(''); setSetRpe(''); setIsWarmup(false);
    },
    onError: () => toast.error('Failed to add set'),
  });

  // Save weight cell — raw is in display unit
  const handleWeightSave = (setId: string, raw: string) => {
    const weightKg = units.parseWeightInput(raw);
    if (weightKg === null) return;
    updateSetMutation.mutate({ setId, data: { weightKg } });
  };

  // Save reps cell
  const handleRepsSave = (setId: string, raw: string) => {
    const reps = parseInt(raw);
    if (isNaN(reps) || reps < 0) return;
    updateSetMutation.mutate({ setId, data: { reps } });
  };

  const setsWithTargets = log.sets as ExerciseSetWithTarget[];
  const hasTargets = setsWithTargets.some((s) => s.targetReps);
  const hasStarted = log.sets.some((s) => s.weightKg != null || s.reps != null || s.durationSecs != null);

  // Suggested weight display value (for the column header hint) — rounded
  // to the nearest 5lb-equivalent so it's a practical number to load up.
  const suggestedDisplay = suggestion?.readyForProgression
    ? units.kgToDisplay(units.roundSuggestedWeightKg(suggestion.suggestedWeightKg)).toFixed(units.isImperial ? 0 : 1)
    : null;

  // Progression-engine-driven placeholders for empty (working) sets — the
  // weight/reps to aim for today, instead of a generic static number.
  // Ready to progress → the bumped-up weight; otherwise → last time's weight.
  const suggestedWeightKg = suggestion?.readyForProgression
    ? suggestion.suggestedWeightKg
    : suggestion?.currentWeightKg ?? null;
  const suggestedWeightPlaceholder = suggestedWeightKg != null
    ? units.kgToDisplay(units.roundSuggestedWeightKg(suggestedWeightKg)).toFixed(units.isImperial ? 0 : 1)
    : null;
  const suggestedRepsPlaceholder = suggestion?.readyForProgression
    ? suggestion.suggestedReps
    : suggestion?.currentReps ?? null;

  // Warmup placeholder — 60% of the first working set's weight (its logged
  // weight if the user has already entered one today, otherwise the same
  // suggestion used for the working sets above).
  const firstWorkingSet = [...log.sets].sort((a, b) => a.setNumber - b.setNumber).find((s) => !s.isWarmup);
  const warmupReferenceWeightKg = firstWorkingSet?.weightKg ?? suggestedWeightKg;
  const warmupWeightPlaceholder = warmupReferenceWeightKg != null
    ? units.kgToDisplay(units.roundSuggestedWeightKg(warmupReferenceWeightKg * 0.6)).toFixed(units.isImperial ? 0 : 1)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-semibold text-ink">{log.exerciseName}</h2>
            {log.muscleGroup && <p className="text-xs text-muted">{log.muscleGroup}</p>}
            <ProgressionBadge suggestion={suggestion} units={units} />
          </div>
          <div className="flex gap-2 shrink-0">
            {!hasStarted && (
              <Button
                size="sm"
                variant="ghost"
                loading={swapMutation.isPending}
                onClick={() => swapMutation.mutate()}
                title="Swap for a random alternative in the same muscle group"
              >
                <Shuffle className="w-3.5 h-3.5" /> Swap
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setAddSetModal(true)}>
              + Set
            </Button>
          </div>
        </div>
        {log.notes && (
          <p className="mt-2 text-xs text-muted italic">{log.notes}</p>
        )}
      </CardHeader>

      <CardBody className="p-0">
        {/* Horizontally scrollable on narrow screens instead of squeezing
            columns down to illegible widths */}
        <div className="overflow-x-auto">
        <div className={hasTargets ? 'min-w-[560px]' : 'min-w-[480px]'}>
        {/* Table header */}
        <div className={`grid text-xs text-muted uppercase tracking-wide px-4 py-2 bg-surface-2 border-b border-line ${hasTargets ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <span className="pl-2">Set</span>
          <span>
            Weight ({units.weightUnit})
            {suggestedDisplay && (
              <span className="ml-1 normal-case text-accent-violet font-normal not-italic">
                · suggested {suggestedDisplay}
              </span>
            )}
          </span>
          <span>Reps</span>
          {hasTargets && <span className="text-accent-violet normal-case font-normal">Plan target</span>}
          <span>RPE</span>
          <span></span>
        </div>

        {setsWithTargets.length === 0 && (
          <p className="text-xs text-muted px-6 py-4">No sets yet — click + Set to add one</p>
        )}

        {setsWithTargets.map((set) => {
          // Current weight in display unit for the editable cell
          const weightDisplay = set.weightKg != null
            ? units.kgToDisplay(set.weightKg).toFixed(units.isImperial ? 0 : 1)
            : '';

          const repsDisplay = set.reps != null ? String(set.reps) : '';

          // Working sets get the progression-engine suggestion as their
          // placeholder; warmups get 60% of the first working set's weight.
          const weightPlaceholder = set.isWarmup
            ? warmupWeightPlaceholder ?? units.weightPlaceholder
            : suggestedWeightPlaceholder ?? units.weightPlaceholder;
          const repsPlaceholder = !set.isWarmup && suggestedRepsPlaceholder != null
            ? String(suggestedRepsPlaceholder)
            : 'reps';

          return (
            <div
              key={set.id}
              className={`grid items-center px-4 py-1.5 border-b last:border-b-0 border-line ${set.isWarmup ? 'bg-accent-coral/10' : ''} ${hasTargets ? 'grid-cols-6' : 'grid-cols-5'}`}
            >
              {/* Set number */}
              <span className="pl-2 text-sm text-muted font-medium">
                {set.isWarmup ? 'W' : set.setNumber}
              </span>

              {/* Editable weight */}
              <EditableCell
                value={weightDisplay}
                placeholder={`${weightPlaceholder} ${units.weightUnit}`}
                step={units.weightInputStep}
                onSave={(raw) => handleWeightSave(set.id, raw)}
              />

              {/* Editable reps */}
              <EditableCell
                value={repsDisplay}
                placeholder={repsPlaceholder}
                step="1"
                onSave={(raw) => handleRepsSave(set.id, raw)}
              />

              {/* Plan target reps (read-only hint) */}
              {hasTargets && (
                <span className="text-xs text-accent-violet font-medium px-2">
                  {set.targetReps ?? '—'}
                </span>
              )}

              {/* RPE (read-only for now) */}
              <span className="text-sm text-muted px-2">
                {set.rpe != null ? set.rpe : '—'}
              </span>

              {/* Delete */}
              <button
                onClick={() => deleteSetMutation.mutate(set.id)}
                className="text-danger/50 hover:text-danger transition-colors justify-self-end pr-2"
                aria-label="Delete set"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        </div>
        </div>
      </CardBody>

      {/* Add set modal */}
      <Modal open={addSetModal} onClose={() => setAddSetModal(false)} title={`Add set — ${log.exerciseName}`}>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); addSetMutation.mutate(); }} className="space-y-4">
          {/* Show suggestion as a prompt */}
          {suggestion?.readyForProgression && (
            <div className="bg-surface-2 border border-line rounded-lg px-4 py-3 text-sm text-accent-violet flex items-start gap-2">
              <Rocket className="w-4 h-4 shrink-0 mt-0.5" />
              <span><strong>Suggested:</strong> {units.formatWeight(units.roundSuggestedWeightKg(suggestion.suggestedWeightKg))} — you've earned this increase!</span>
            </div>
          )}
          {suggestion && !suggestion.readyForProgression && suggestion.currentWeightKg > 0 && (
            <div className="bg-surface-2 border border-line rounded-lg px-4 py-3 text-sm text-muted">
              Last time: {units.formatWeight(suggestion.currentWeightKg)} × {suggestion.currentReps} reps avg
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Weight (${units.weightUnit})`}
              type="number"
              step={units.weightInputStep}
              min="0"
              value={setWeightDisplay}
              onChange={(e) => setSetWeightDisplay(e.target.value)}
              placeholder={
                (isWarmup ? warmupWeightPlaceholder : suggestedWeightPlaceholder) ?? units.weightPlaceholder
              }
              autoFocus
            />
            <Input
              label="Reps"
              type="number"
              value={setReps}
              onChange={(e) => setSetReps(e.target.value)}
              placeholder={suggestedRepsPlaceholder != null ? String(suggestedRepsPlaceholder) : '10'}
            />
          </div>
          <Input
            label="RPE (1–10, optional)"
            type="number"
            step="0.5"
            min="1"
            max="10"
            value={setRpe}
            onChange={(e) => setSetRpe(e.target.value)}
            placeholder="8"
          />
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={isWarmup} onChange={(e) => setIsWarmup(e.target.checked)} className="rounded" />
            Warmup set
          </label>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setAddSetModal(false)}>Cancel</Button>
            <Button type="submit" loading={addSetMutation.isPending}>Add set</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const units = useUnits();

  const [addExModal, setAddExModal] = useState(false);
  const [exName, setExName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');

  const { data: session, isLoading } = useQuery({
    queryKey: ['workout', id],
    queryFn: () => workoutsApi.get(id!),
    enabled: !!id,
  });

  const addExMutation = useMutation({
    mutationFn: () =>
      workoutsApi.addExercise(id!, {
        exerciseName: exName,
        muscleGroup: muscleGroup || undefined,
        orderIndex: session?.exerciseLogs.length ?? 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', id] });
      toast.success('Exercise added');
      setAddExModal(false);
      setExName(''); setMuscleGroup('');
    },
    onError: () => toast.error('Failed to add exercise'),
  });

  const endSessionMutation = useMutation({
    mutationFn: () => workoutsApi.update(id!, { endedAt: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout', id] });
      toast.success('Session finished!');
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: () => workoutsApi.delete(id!),
    onSuccess: () => { navigate('/workouts'); toast.success('Session deleted'); },
  });

  if (isLoading) return <div className="p-6 text-muted">Loading...</div>;
  if (!session) return <div className="p-6 text-muted">Session not found</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate('/workouts')} className="text-sm text-muted hover:text-ink mb-1">
            ← Back
          </button>
          <h1 className="text-2xl font-extrabold text-ink">{session.name}</h1>
          <p className="text-sm text-muted mt-1">
            {format(new Date(session.startedAt), 'EEEE, MMM d · h:mm a')}
            {session.endedAt && ` – ${format(new Date(session.endedAt), 'h:mm a')}`}
          </p>
          {!session.endedAt && (
            <p className="text-xs text-accent-violet mt-1 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5" /> Click any weight or reps cell to edit it inline
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {!session.endedAt && (
            <Button variant="secondary" size="sm" onClick={() => endSessionMutation.mutate()}>
              Finish
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => deleteSessionMutation.mutate()}>
            Delete
          </Button>
        </div>
      </div>

      {/* Exercise cards — each manages its own state and mutations */}
      {session.exerciseLogs.map((log: ExerciseLog) => (
        <ExerciseCard key={log.id} log={log} sessionId={id!} units={units} />
      ))}

      <Button variant="secondary" className="w-full" onClick={() => setAddExModal(true)}>
        + Add exercise
      </Button>

      {/* Add exercise modal */}
      <Modal open={addExModal} onClose={() => setAddExModal(false)} title="Add exercise">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); addExMutation.mutate(); }} className="space-y-4">
          <Input label="Exercise name" value={exName} onChange={(e) => setExName(e.target.value)} placeholder="Bench Press" required autoFocus />
          <Input label="Muscle group (optional)" value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)} placeholder="Chest" />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setAddExModal(false)}>Cancel</Button>
            <Button type="submit" loading={addExMutation.isPending}>Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
