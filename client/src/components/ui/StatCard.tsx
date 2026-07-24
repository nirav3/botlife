interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}

export function StatCard({ label, value, sub, trend, icon }: StatCardProps) {
  const trendColor =
    trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-500';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-start gap-4">
      {icon && <span className="text-2xl mt-0.5">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && (
          <p className={`text-xs mt-0.5 ${trendColor}`}>
            {trendArrow} {sub}
          </p>
        )}
      </div>
    </div>
  );
}
