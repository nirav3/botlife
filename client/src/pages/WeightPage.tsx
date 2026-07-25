import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { Scale, MapPin, Flag, BarChart3, TrendingUp, X } from 'lucide-react';
import { weightApi } from '@/api/weight';
import { useUnits } from '@/hooks/useUnits';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

export default function WeightPage() {
  const qc = useQueryClient();
  const units = useUnits();
  const [modalOpen, setModalOpen] = useState(false);
  // Input is always in display unit
  const [weightInput, setWeightInput] = useState('');
  const [note, setNote] = useState('');

  const { data: history } = useQuery({
    queryKey: ['weight-history'],
    queryFn: () => weightApi.history({ limit: 60 }),
  });

  const { data: stats } = useQuery({
    queryKey: ['weight-stats'],
    queryFn: weightApi.stats,
  });

  const logMutation = useMutation({
    mutationFn: () => {
      const weightKg = units.parseWeightInput(weightInput);
      if (!weightKg) throw new Error('Invalid weight');
      return weightApi.log({ weightKg, note: note || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-history'] });
      qc.invalidateQueries({ queryKey: ['weight-stats'] });
      toast.success('Weight logged!');
      setModalOpen(false);
      setWeightInput('');
      setNote('');
    },
    onError: () => toast.error('Failed to log weight'),
  });

  const deleteMutation = useMutation({
    mutationFn: weightApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-history'] });
      qc.invalidateQueries({ queryKey: ['weight-stats'] });
      toast.success('Entry deleted');
    },
    onError: () => toast.error('Failed to delete entry'),
  });

  // Chart data: convert stored kg to display unit
  const chartData = [...(history?.data ?? [])]
    .reverse()
    .map((e) => ({
      date: format(new Date(e.loggedAt), 'MMM d'),
      weight: parseFloat(units.kgToDisplay(e.weightKg).toFixed(units.isImperial ? 0 : 1)),
    }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!weightInput || isNaN(parseFloat(weightInput))) {
      toast.error('Enter a valid weight');
      return;
    }
    logMutation.mutate();
  };

  // Format a stat that's stored in kg
  const fmtStat = (kg: number | undefined | null) =>
    kg != null ? units.formatWeight(kg) : '—';

  // Format a change value (can be negative)
  const fmtChange = (kg: number) => {
    const val = units.kgToDisplay(Math.abs(kg));
    const sign = kg < 0 ? '-' : '+';
    const d = units.isImperial ? 0 : 1;
    return `${sign}${val.toFixed(d)} ${units.weightUnit}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <Scale className="w-6 h-6 text-accent-cyan" /> Weight Tracker
        </h1>
        <Button onClick={() => setModalOpen(true)}>+ Log weight</Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Current" value={fmtStat(stats.current)} icon={<MapPin />} valueColor="text-accent-cyan" />
          <StatCard label="Starting" value={fmtStat(stats.starting)} icon={<Flag />} valueColor="text-accent-cyan" />
          <StatCard
            label="Total change"
            value={fmtChange(stats.totalChange)}
            icon={<BarChart3 />}
            trend={stats.totalChange < 0 ? 'down' : stats.totalChange > 0 ? 'up' : 'neutral'}
          />
          <StatCard
            label="Weekly trend"
            value={stats.weeklyTrend != null ? fmtChange(stats.weeklyTrend) : '—'}
            icon={<TrendingUp />}
            trend={
              stats.weeklyTrend == null ? 'neutral' :
              stats.weeklyTrend < 0 ? 'down' : stats.weeklyTrend > 0 ? 'up' : 'neutral'
            }
          />
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-ink">
              Weight over time ({units.weightUnit})
            </h2>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8e8e93" strokeOpacity={0.25} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8e8e93' }} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#8e8e93' }}
                  tickFormatter={(v: number) => `${v}${units.weightUnit}`}
                />
                <Tooltip
                  formatter={(v: number) => [`${v} ${units.weightUnit}`, 'Weight']}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#2fb8c6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* History table */}
      <Card>
        <CardHeader><h2 className="font-semibold text-ink">History</h2></CardHeader>
        <CardBody className="p-0">
          {history?.data.length === 0 && (
            <p className="text-center text-muted text-sm py-8">No entries yet</p>
          )}
          {history?.data.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between px-6 py-3 border-b last:border-b-0 border-line"
            >
              <div>
                <p className="text-sm font-semibold text-ink">
                  {units.formatWeight(entry.weightKg)}
                </p>
                {entry.note && <p className="text-xs text-muted">{entry.note}</p>}
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs text-muted">{format(new Date(entry.loggedAt), 'MMM d, yyyy')}</p>
                <button
                  onClick={() => deleteMutation.mutate(entry.id)}
                  className="text-danger/60 hover:text-danger transition-colors"
                  aria-label="Delete entry"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Log modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log weight">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={`Weight (${units.weightUnit})`}
            type="number"
            step={units.weightInputStep}
            min="0"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder={units.weightPlaceholder}
            required
            autoFocus
          />
          <Input
            label="Note (optional)"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Morning, fasted"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={logMutation.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
