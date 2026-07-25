interface ProgressRingProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  color?: string;
  size?: number;
}

// Circular progress indicator — inspired by the idea of a glanceable ring
// goal (Apple Fitness), but a single custom ring with our own metric
// colors, not the specific three-ring Move/Exercise/Stand graphic.
export function ProgressRing({ value, max, label, unit, color = '#ff7a45', size = 96 }: ProgressRingProps) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <div className="bg-surface rounded-2xl border border-line px-4 py-4 flex flex-col items-center gap-1.5 w-full">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="rgb(var(--surface-2))" strokeWidth={9} />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-extrabold text-lg text-ink leading-none">{Math.round(value).toLocaleString()}</span>
          {unit && <span className="text-[9.5px] text-muted font-semibold mt-0.5">of {Math.round(max).toLocaleString()} {unit}</span>}
        </div>
      </div>
      <span className="text-xs text-muted font-semibold">{label}</span>
    </div>
  );
}
