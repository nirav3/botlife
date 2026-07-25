import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Timer, Play, ClipboardList, Search } from 'lucide-react';
import { plansApi } from '@/api/plans';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { WorkoutPlanSummary, PlanDay } from '@/types';
import toast from 'react-hot-toast';

// ─── Difficulty / goal badge colours ─────────────────────────────────────────
const difficultyColour: Record<string, string> = {
  Beginner:     'bg-accent-lime/15 text-accent-lime',
  Intermediate: 'bg-accent-cyan/15 text-accent-cyan',
  Advanced:     'bg-accent-coral/15 text-accent-coral',
};

const goalColour: Record<string, string> = {
  Strength:        'bg-accent-violet/15 text-accent-violet',
  Hypertrophy:     'bg-accent-cyan/15 text-accent-cyan',
  'Fat Loss':      'bg-accent-coral/15 text-accent-coral',
  'General Fitness': 'bg-surface-2 text-muted',
};

// ─── Plan catalog card ────────────────────────────────────────────────────────
function PlanCard({ plan, onSelect }: { plan: WorkoutPlanSummary; onSelect: () => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" >
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold text-ink text-lg leading-tight">{plan.name}</h2>
          <div className="flex flex-col gap-1 items-end shrink-0">
            {plan.ownerId && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent-violet/15 text-accent-violet">
                Mine
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColour[plan.difficulty]}`}>
              {plan.difficulty}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${goalColour[plan.goal]}`}>
              {plan.goal}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted leading-relaxed">{plan.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {plan.tags.map((t) => (
            <span key={t} className="text-xs bg-surface-2 text-muted px-2 py-0.5 rounded-md">{t}</span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {plan.daysPerWeek}×/week</span>
            <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> ~{plan.estimatedMinutes} min</span>
          </div>
          <Button size="sm" onClick={onSelect}>View plan</Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Plan detail panel ────────────────────────────────────────────────────────
function PlanDetail({ planId, onClose }: { planId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<PlanDay | null>(null);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => plansApi.get(planId),
  });

  const startMutation = useMutation({
    mutationFn: (dayNumber: number) => plansApi.startDay(planId, dayNumber),
    onSuccess: (session) => {
      toast.success('Session started!');
      navigate(`/workouts/${session.id}`);
    },
    onError: () => toast.error('Failed to start session'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => plansApi.delete(planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan deleted');
      onClose();
    },
    onError: () => toast.error('Failed to delete plan'),
  });

  const isOwner = !!plan?.ownerId && plan.ownerId === user?.id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={onClose} className="text-sm text-muted hover:text-ink mb-1">
            ← Back to plans
          </button>
          <h1 className="text-2xl font-extrabold text-ink">{plan.name}</h1>
          <p className="text-sm text-muted mt-1">{plan.description}</p>
          <div className="flex gap-3 mt-2 text-xs text-muted items-center">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {plan.daysPerWeek}×/week</span>
            <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> ~{plan.estimatedMinutes} min/session</span>
            <span className={`font-medium px-2 py-0.5 rounded-full ${difficultyColour[plan.difficulty]}`}>{plan.difficulty}</span>
            <span className={`font-medium px-2 py-0.5 rounded-full ${goalColour[plan.goal]}`}>{plan.goal}</span>
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/plans/${plan.id}/edit`)}>
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Day selector */}
      <div>
        <h2 className="font-semibold text-ink mb-3">Weekly schedule</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {plan.days.map((day) => (
            <button
              key={day.dayNumber}
              onClick={() => setSelectedDay(selectedDay?.dayNumber === day.dayNumber ? null : day)}
              className={`text-left p-3 rounded-xl border transition-all ${
                selectedDay?.dayNumber === day.dayNumber
                  ? 'border-accent-violet bg-surface-2 ring-1 ring-accent-violet/40'
                  : 'border-line bg-surface hover:border-accent-violet/40 hover:bg-surface-2'
              }`}
            >
              <p className="font-semibold text-sm text-ink">{day.label}</p>
              <p className="text-xs text-muted mt-0.5">{day.exercises.length} exercises</p>
            </button>
          ))}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">{selectedDay.label}</h2>
            <Button
              onClick={() => startMutation.mutate(selectedDay.dayNumber)}
              loading={startMutation.isPending}
              size="sm"
            >
              <Play className="w-4 h-4" /> Start this workout
            </Button>
          </div>

          {selectedDay.exercises.map((ex, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-ink">{ex.name}</p>
                    <p className="text-xs text-muted">{ex.muscleGroup}</p>
                  </div>
                  {ex.notes && (
                    <p className="text-xs text-accent-violet bg-surface-2 px-2 py-1 rounded-lg max-w-[200px] text-right">
                      {ex.notes}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <div className="grid grid-cols-3 text-xs text-muted uppercase tracking-wide px-6 py-2 bg-surface-2 border-b border-line">
                  <span>Set</span>
                  <span>Target reps</span>
                  <span>Type</span>
                </div>
                {ex.sets.map((s) => (
                  <div
                    key={s.setNumber}
                    className={`grid grid-cols-3 px-6 py-2.5 text-sm border-b last:border-b-0 border-line ${s.isWarmup ? 'bg-accent-coral/10' : ''}`}
                  >
                    <span className="text-muted">{s.isWarmup ? 'W' : s.setNumber}</span>
                    <span className="font-medium text-ink">{s.targetReps}</span>
                    <span className="text-xs text-muted">{s.isWarmup ? 'Warmup' : 'Working'}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          ))}

          <Button
            className="w-full"
            size="lg"
            onClick={() => startMutation.mutate(selectedDay.dayNumber)}
            loading={startMutation.isPending}
          >
            <Play className="w-4 h-4" /> Start {selectedDay.label}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PlansPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('All');
  const [filterGoal, setFilterGoal] = useState<string>('All');

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  });

  const matchesFilters = (p: WorkoutPlanSummary) => {
    if (filterDifficulty !== 'All' && p.difficulty !== filterDifficulty) return false;
    if (filterGoal !== 'All' && p.goal !== filterGoal) return false;
    return true;
  };

  const myPlans = plans?.filter((p) => p.ownerId === user?.id).filter(matchesFilters);
  const samplePlans = plans?.filter((p) => p.ownerId === null).filter(matchesFilters);

  if (selectedPlanId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PlanDetail planId={selectedPlanId} onClose={() => setSelectedPlanId(null)} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-accent-violet" /> Workout Plans
          </h1>
          <p className="text-muted text-sm mt-1">
            Choose a program and start any day — exercises are pre-loaded, you just log your weights and reps.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate('/plans/new')} className="shrink-0">
          + Create Plan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-medium">Difficulty:</span>
          {['All', 'Beginner', 'Intermediate', 'Advanced'].map((d) => (
            <button
              key={d}
              onClick={() => setFilterDifficulty(d)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filterDifficulty === d
                  ? 'bg-btn-primary text-btn-primary-text border-btn-primary'
                  : 'border-line text-muted hover:border-accent-violet/40'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-medium">Goal:</span>
          {['All', 'Strength', 'Hypertrophy', 'Fat Loss', 'General Fitness'].map((g) => (
            <button
              key={g}
              onClick={() => setFilterGoal(g)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filterGoal === g
                  ? 'bg-btn-primary text-btn-primary-text border-btn-primary'
                  : 'border-line text-muted hover:border-accent-violet/40'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-violet" />
        </div>
      )}

      {!isLoading && myPlans && myPlans.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-ink">My Plans</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {myPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onSelect={() => setSelectedPlanId(plan.id)} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-3">
          <h2 className="font-semibold text-ink">Sample Plans</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {samplePlans?.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onSelect={() => setSelectedPlanId(plan.id)} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && myPlans?.length === 0 && samplePlans?.length === 0 && (
        <div className="text-center py-12 text-muted">
          <Search className="w-8 h-8 mx-auto mb-2" />
          <p>No plans match your filters</p>
        </div>
      )}
    </div>
  );
}
