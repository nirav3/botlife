import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnits } from '@/hooks/useUnits';
import { weightApi } from '@/api/weight';
import { workoutsApi } from '@/api/workouts';
import { mealsApi } from '@/api/meals';
import { progressionApi } from '@/api/progression';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const units = useUnits();

  const { data: weightStats } = useQuery({ queryKey: ['weight-stats'], queryFn: weightApi.stats });
  const { data: sessions } = useQuery({ queryKey: ['workouts', 1], queryFn: () => workoutsApi.list({ limit: 5 }) });
  const { data: dailySummary } = useQuery({ queryKey: ['daily-summary'], queryFn: () => mealsApi.dailySummary() });
  const { data: progression } = useQuery({ queryKey: ['progression'], queryFn: () => progressionApi.all() });

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
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getTimeOfDay()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="⚖️"
          label="Current weight"
          value={fmtWeight(weightStats?.current)}
          sub={fmtTrend(weightStats?.weeklyTrend)}
          trend={
            weightStats?.weeklyTrend == null ? 'neutral' :
            weightStats.weeklyTrend < 0 ? 'down' :
            weightStats.weeklyTrend > 0 ? 'up' : 'neutral'
          }
        />
        <StatCard
          icon="🔥"
          label="Calories today"
          value={dailySummary ? Math.round(dailySummary.totals.calories) : '—'}
          sub={
            dailySummary?.targets?.calories
              ? `goal: ${dailySummary.targets.calories} kcal`
              : undefined
          }
        />
        <StatCard
          icon="🏋️"
          label="Total sessions"
          value={sessions?.pagination.total ?? '—'}
        />
        <StatCard
          icon="📈"
          label="Ready to progress"
          value={readyCount}
          sub={readyCount > 0 ? 'exercises ready for increase' : 'keep going!'}
          trend={readyCount > 0 ? 'up' : 'neutral'}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent workouts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Recent workouts</h2>
              <Link to="/workouts" className="text-xs text-brand-600 hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {sessions?.data.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No workouts yet</p>
            )}
            {sessions?.data.map((s) => (
              <Link
                key={s.id}
                to={`/workouts/${s.id}`}
                className="flex items-center justify-between px-6 py-3 border-b last:border-b-0 border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{format(new Date(s.startedAt), 'MMM d, yyyy')}</p>
                </div>
                <span className="text-xs text-gray-400">{s.exerciseLogs.length} exercises</span>
              </Link>
            ))}
          </CardBody>
        </Card>

        {/* Today's macros */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Today's nutrition</h2>
              <Link to="/meals" className="text-xs text-brand-600 hover:underline">Log food</Link>
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
                  color="bg-blue-400"
                />
                <MacroBar
                  label="Carbs"
                  value={dailySummary.totals.carbsG}
                  target={dailySummary.targets?.carbsG ?? null}
                  unit="g"
                  color="bg-yellow-400"
                />
                <MacroBar
                  label="Fat"
                  value={dailySummary.totals.fatG}
                  target={dailySummary.targets?.fatG ?? null}
                  unit="g"
                  color="bg-orange-400"
                />
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No meals logged today</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Progression alerts */}
      {readyCount > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-800">🚀 Ready to progress</h2>
          </CardHeader>
          <CardBody className="p-0">
            {progression?.ready.map((s) => (
              <div key={s.exerciseName} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0 border-gray-50">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.exerciseName}</p>
                  <p className="text-xs text-gray-500">{s.reason.replace(/(\d+(?:\.\d+)?)\s*kg/g, (_m: string, v: string) => `${units.kgToDisplay(parseFloat(v)).toFixed(units.isImperial ? 0 : 1)} ${units.weightUnit}`)}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-gray-400 line-through">{units.formatWeight(s.currentWeightKg)}</p>
                  <p className="text-sm font-bold text-brand-600">{units.formatWeight(s.suggestedWeightKg)}</p>
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
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{Math.round(value)}{unit}{target ? ` / ${target}${unit}` : ''}</span>
      </div>
      {target && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
