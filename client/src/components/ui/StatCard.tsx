import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  /** Per-metric accent for the value text, e.g. "text-accent-cyan" — defaults to plain ink */
  valueColor?: string;
}

export function StatCard({ label, value, sub, trend, icon, valueColor = 'text-ink' }: StatCardProps) {
  const trendColor =
    trend === 'up' ? 'text-accent-lime' : trend === 'down' ? 'text-danger' : 'text-muted';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div className="bg-surface rounded-2xl border border-line shadow-sm px-5 py-4 flex items-start gap-4">
      {icon && <span className="mt-0.5 text-muted [&_svg]:w-6 [&_svg]:h-6">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs text-muted uppercase tracking-wide font-semibold">{label}</p>
        <p className={`text-2xl font-extrabold mt-0.5 ${valueColor}`}>{value}</p>
        {sub && (
          <p className={`text-xs mt-0.5 ${trendColor}`}>
            {trendArrow} {sub}
          </p>
        )}
      </div>
    </div>
  );
}
