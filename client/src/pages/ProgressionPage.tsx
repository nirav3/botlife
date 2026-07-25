import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, X } from 'lucide-react';
import { progressionApi } from '@/api/progression';
import { useUnits } from '@/hooks/useUnits';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ProgressionSuggestion } from '@/types';

export default function ProgressionPage() {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const units = useUnits();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['progression'],
    queryFn: () => progressionApi.all(),
  });

  const { data: history } = useQuery({
    queryKey: ['progression-history', selectedExercise],
    queryFn: () => progressionApi.history(selectedExercise!, 20),
    enabled: !!selectedExercise,
  });

  // Convert stored kg values to display unit for the chart
  const chartData = [...(history ?? [])]
    .reverse()
    .map((h) => ({
      date: format(new Date(h.sessionDate), 'MMM d'),
      weight: parseFloat(units.kgToDisplay(h.weightKg).toFixed(units.isImperial ? 0 : 1)),
      reps: h.avgRepsPerSet,
    }));

  if (isLoading) return <div className="p-6 text-muted">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-accent-violet" /> Progressive Overload
        </h1>
        <span className="text-xs text-muted bg-surface-2 px-3 py-1 rounded-full">
          Showing weights in {units.weightUnit}
        </span>
      </div>

      {overview?.total === 0 && (
        <div className="text-center py-16 text-muted">
          <TrendingUp className="w-10 h-10 mx-auto mb-3" />
          <p className="font-medium">No workout history yet</p>
          <p className="text-sm mt-1">Log a few workouts and suggestions will appear here</p>
        </div>
      )}

      {/* Ready to progress */}
      {(overview?.ready.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-accent-violet flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent-violet" />
            Ready to increase weight ({overview!.ready.length})
          </h2>
          {overview!.ready.map((s) => (
            <SuggestionCard
              key={s.exerciseName}
              suggestion={s}
              units={units}
              onSelect={setSelectedExercise}
              selected={selectedExercise === s.exerciseName}
            />
          ))}
        </div>
      )}

      {/* In progress */}
      {(overview?.inProgress.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-muted flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-muted" />
            In progress ({overview!.inProgress.length})
          </h2>
          {overview!.inProgress.map((s) => (
            <SuggestionCard
              key={s.exerciseName}
              suggestion={s}
              units={units}
              onSelect={setSelectedExercise}
              selected={selectedExercise === s.exerciseName}
            />
          ))}
        </div>
      )}

      {/* History chart for selected exercise */}
      {selectedExercise && chartData.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink">
                {selectedExercise} — history ({units.weightUnit})
              </h2>
              <button onClick={() => setSelectedExercise(null)} className="text-xs text-muted hover:text-ink flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Close
              </button>
            </div>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8e8e93" strokeOpacity={0.25} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8e8e93' }} />
                <YAxis
                  yAxisId="weight"
                  orientation="left"
                  tick={{ fontSize: 11, fill: '#8e8e93' }}
                  tickFormatter={(v: number) => `${v}${units.weightUnit}`}
                  domain={['auto', 'auto']}
                />
                <YAxis
                  yAxisId="reps"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#8e8e93' }}
                  tickFormatter={(v: number) => `${v}r`}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'weight'
                      ? [`${value} ${units.weightUnit}`, 'Weight']
                      : [`${value} reps`, 'Avg reps/set']
                  }
                />
                <Line yAxisId="weight" type="monotone" dataKey="weight" stroke="#9d7bf0" strokeWidth={2} dot={{ r: 4 }} name="weight" />
                <Line yAxisId="reps" type="monotone" dataKey="reps" stroke="#2fb8c6" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" name="reps" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-accent-violet inline-block" /> Weight ({units.weightUnit})</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-accent-cyan inline-block" /> Avg reps / set</span>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion: s,
  units,
  onSelect,
  selected,
}: {
  suggestion: ProgressionSuggestion;
  units: ReturnType<typeof import('@/hooks/useUnits').useUnits>;
  onSelect: (name: string) => void;
  selected: boolean;
}) {
  // Convert stored kg values to display unit
  const currentDisplay = units.kgToDisplay(s.currentWeightKg);
  const suggestedDisplay = units.kgToDisplay(s.suggestedWeightKg);
  const decimals = units.isImperial ? 0 : 1;

  // Re-format the reason string to use display units
  const reasonDisplay = s.reason.replace(
    /(\d+(?:\.\d+)?)\s*kg/g,
    (_match, kgVal: string) => {
      const display = units.kgToDisplay(parseFloat(kgVal));
      return `${display.toFixed(decimals)} ${units.weightUnit}`;
    }
  );

  return (
    <Card className={selected ? 'ring-2 ring-accent-violet' : ''}>
      <CardBody className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-ink">{s.exerciseName}</p>
            {s.readyForProgression && (
              <span className="text-xs bg-surface-2 text-accent-violet px-2 py-0.5 rounded-full font-medium">
                Increase now
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">{reasonDisplay}</p>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="text-center">
            <p className="text-xs text-muted">Current</p>
            <p className="text-lg font-bold text-ink">
              {currentDisplay.toFixed(decimals)}
              <span className="text-xs font-normal text-muted ml-0.5">{units.weightUnit}</span>
            </p>
            <p className="text-xs text-muted">{s.currentReps} reps avg</p>
          </div>
          {s.readyForProgression && (
            <>
              <span className="text-accent-violet text-xl">→</span>
              <div className="text-center">
                <p className="text-xs text-muted">Suggested</p>
                <p className="text-lg font-bold text-accent-violet">
                  {suggestedDisplay.toFixed(decimals)}
                  <span className="text-xs font-normal text-muted ml-0.5">{units.weightUnit}</span>
                </p>
                {s.suggestedReps && (
                  <p className="text-xs text-muted">aim {s.suggestedReps}+ reps</p>
                )}
              </div>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => onSelect(s.exerciseName)}>
            {selected ? 'Hide' : 'History'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
