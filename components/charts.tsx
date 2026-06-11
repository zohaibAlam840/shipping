// Tiny dependency-free chart primitives (SVG + CSS) for the dashboards.

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/** Donut chart with a centered total. */
export function Donut({
  segments,
  size = 140,
  thickness = 18,
  centerLabel,
  centerValue,
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {segments.map((seg) => {
          const len = (seg.value / total) * c;
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {(centerValue || segments.length > 0) && (
        <div className="min-w-0 flex-1">
          {centerValue && (
            <div className="mb-3">
              <p className="text-2xl font-bold text-ink leading-none">{centerValue}</p>
              {centerLabel && <p className="text-xs text-muted mt-1">{centerLabel}</p>}
            </div>
          )}
          <ul className="space-y-1.5">
            {segments.map((seg) => (
              <li key={seg.label} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: seg.color }} />
                <span className="text-muted flex-1 truncate">{seg.label}</span>
                <span className="font-semibold text-ink">{seg.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Vertical bar chart with labels under each bar. */
export function BarChart({
  data,
  height = 140,
  valuePrefix = "",
}: {
  data: { label: string; value: number }[];
  height?: number;
  valuePrefix?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => {
        const h = d.value === 0 ? 3 : Math.max((d.value / max) * (height - 28), 6);
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-bold text-ink tabular-nums">
              {d.value > 0 ? `${valuePrefix}${d.value}` : ""}
            </span>
            <div
              className="w-full rounded-md bg-gradient-to-t from-brand to-emerald-400 transition-all"
              style={{ height: h }}
              title={`${d.label}: ${valuePrefix}${d.value}`}
            />
            <span className="text-[10px] font-medium text-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal labelled bars (e.g. routes, destinations). */
export function HBars({
  data,
}: {
  data: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-ink">{d.label}</span>
            <span className="font-semibold text-muted tabular-nums">{d.value}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? "var(--brand)" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Slim pipeline progress used on the active-shipment focus card. */
export function PipelineProgress({
  current,
  total,
}: {
  current: number; // 0-based index reached
  total: number;
}) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] font-medium text-white/80">{pct}% of the way there</p>
    </div>
  );
}
