import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Dumbbell, TrendingUp, Rocket, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUnits } from '@/hooks/useUnits';
import { weightApi } from '@/api/weight';
import { workoutsApi } from '@/api/workouts';
import { mealsApi } from '@/api/meals';
import { progressionApi } from '@/api/progression';
import { plansApi } from '@/api/plans';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const units = useUnits();
  const navigate = useNavigate();

  const { data: weightStats } = useQuery({ queryKey: ['weight-stats'], queryFn: weightApi.stats });
  const { data: sessions } = useQuery({ queryKey: ['workouts', 1], queryFn: () => workoutsApi.list({ limit: 5 }) });
  const { data: dailySummary } = useQuery({ queryKey: ['daily-summary'], queryFn: () => mealsApi.dailySummary() });
  const { data: progression } = useQuery({ queryKey: ['progression'], queryFn: () => progressionApi.all() });
  const { data: nextWorkout } = useQuery({ queryKey: ['next-workout'], queryFn: plansApi.nextWorkout });

  const startNextWorkoutMutation = useMutation({
    mutationFn: () => plansApi.startDay(nextWorkout!.planId, nextWorkout!.dayNumber),
    onSuccess: (session) => {
      toast.success('Session started!');
      navigate(`/workouts/${session.id}`);
    },
    onError: () => toast.error('Failed to start session'),
  });

  const readyCount = progression?.ready.length ?? 0;

  const fmtWeight = (kg: number | undefined | null) =>
    kg != null ? units.formatWeight(kg) : '—';

  const fmtTrend = (kg: number | null | undefined) => {
    if (kg == null) return undefined;
    const val = units.kgToDisplay(Math.abs(kg));
    const sign = kg > 0 ? '+' : '-';
    const d = units.isImperial ? 0 : 1;
    return `${sign}${val.toFixed(d)} ${units.weightUnit} this week`;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink">
          Good {getTimeOfDay()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted text-sm mt-1">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      {/* Hero row: energy ring + the other 3 metrics, each with its own color */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="sm:w-44 shrink-0">
          <ProgressRing
            value={dailySummary?.totals.calories ?? 0}
            max={dailySummary?.targets?.calories ?? 2000}
            label="Energy today"
            unit="kcal"
            color="#ff7a45"
          />
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<Scale />}
            label="Current weight"
            value={fmtWeight(weightStats?.current)}
            sub={fmtTrend(weightStats?.weeklyTrend)}
            trend={
              weightStats?.weeklyTrend == null ? 'neutral' :
              weightStats.weeklyTrend < 0 ? 'down' :
              weightStats.weeklyTrend > 0 ? 'up' : 'neutral'
            }
            valueColor="text-accent-cyan"
          />
          <StatCard
            icon={<Dumbbell />}
            label="Total sessions"
            value={sessions?.pagination.total ?? '—'}
            valueColor="text-accent-lime"
          />
          <StatCard
            icon={<TrendingUp />}
            label="Ready to progress"
            value={readyCount}
            sub={readyCount > 0 ? 'exercises ready for increase' : 'keep going!'}
            trend={readyCount > 0 ? 'up' : 'neutral'}
            valueColor="text-accent-violet"
          />
        </div>
      </div>

      {/* Continue plan — jump straight to the next workout instead of
          having to go to Plans and pick a day by hand */}
      {nextWorkout && (
        <Card>
          <CardBody className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide">Continue plan · {nextWorkout.planName}</p>
              <p className="font-semibold text-ink mt-0.5">{nextWorkout.label} — {nextWorkout.sessionName}</p>
            </div>
            <Button
              onClick={() => startNextWorkoutMutation.mutate()}
              loading={startNextWorkoutMutation.isPending}
            >
              <Play className="w-4 h-4" /> Start next workout
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent workouts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink">Recent workouts</h2>
              <Link to="/workouts" className="text-xs text-accent-violet hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {sessions?.data.length === 0 && (
              <p className="text-sm text-muted text-center py-6">No workouts yet</p>
            )}
            {sessions?.data.map((s) => (
              <Link
                key={s.id}
                to={`/workouts/${s.id}`}
                className="flex items-center justify-between px-6 py-3 border-b last:border-b-0 border-line hover:bg-surface-2 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-muted">{format(new Date(s.startedAt), 'MMM d, yyyy')}</p>
                </div>
                <span className="text-xs text-muted">{s.exerciseLogs.length} exercises</span>
              </Link>
            ))}
          </CardBody>
        </Card>

        {/* Today's macros */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink">Today's nutrition</h2>
              <Link to="/meals" className="text-xs text-accent-violet hover:underline">Log food</Link>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {dailySummary ? (
              <>
                <MacroBar
                  label="Protein"
                  value={dailySummary.totals.proteinG}
                  target={dailySummary.targets?.proteinG ?? null}
                  unit="g"
                  color="bg-accent-cyan"
                />
                <MacroBar
                  label="Carbs"
                  value={dailySummary.totals.carbsG}
                  target={dailySummary.targets?.carbsG ?? null}
                  unit="g"
                  color="bg-accent-lime"
                />
                <MacroBar
                  label="Fat"
                  value={dailySummary.totals.fatG}
                  target={dailySummary.targets?.fatG ?? null}
                  unit="g"
                  color="bg-accent-coral"
                />
              </>
            ) : (
              <p className="text-sm text-muted text-center py-4">No meals logged today</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Progression alerts */}
      {readyCount > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-ink flex items-center gap-2">
              <Rocket className="w-4 h-4 text-accent-violet" /> Ready to progress
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {progression?.ready.map((s) => (
              <div key={s.exerciseName} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0 border-line">
                <div>
                  <p className="text-sm font-semibold text-ink">{s.exerciseName}</p>
                  <p className="text-xs text-muted">{s.reason.replace(/(\d+(?:\.\d+)?)\s*kg/g, (_m: string, v: string) => `${units.kgToDisplay(parseFloat(v)).toFixed(units.isImperial ? 0 : 1)} ${units.weightUnit}`)}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-muted line-through">{units.formatWeight(s.currentWeightKg)}</p>
                  <p className="text-sm font-bold text-accent-violet">{units.formatWeight(s.suggestedWeightKg)}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function MacroBar({ label, value, target, unit, color }: {
  label: string; value: number; target: number | null; unit: string; color: string;
}) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-muted mb-1">
        <span>{label}</span>
        <span>{Math.round(value)}{unit}{target ? ` / ${target}${unit}` : ''}</span>
      </div>
      {target && (
        <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
