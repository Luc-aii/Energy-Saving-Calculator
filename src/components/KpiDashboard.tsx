import type { KpiItem } from "@/lib/types/results";
import { formatSgd } from "@/lib/format";

function formatKpiValue(kpi: KpiItem): string {
  if (kpi.unit === "S$/year") return formatSgd(kpi.value);
  if (kpi.unit.startsWith("%")) return `${kpi.value.toFixed(1)}%`;
  if (kpi.unit.includes("tCO2e")) return `${kpi.value.toFixed(2)} ${kpi.unit}`;
  return `${kpi.value.toFixed(1)} ${kpi.unit}`;
}

export function KpiDashboard({ kpis }: { kpis: KpiItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {kpis.map((kpi) => (
        <div key={kpi.id} className="group relative rounded-lg border border-border p-3">
          <p className="text-[10px] uppercase tracking-wide text-ink-soft">{kpi.label}</p>
          <p className="mt-0.5 text-lg font-bold text-ink">{formatKpiValue(kpi)}</p>
          {kpi.benchmark && (
            <div className="mt-2">
              <MiniBar value={kpi.value} benchmark={kpi.benchmark} />
            </div>
          )}
          <p className="pointer-events-none absolute inset-x-2 bottom-full z-20 mb-2 hidden rounded-md border border-border bg-card p-2 text-[10px] leading-snug text-ink-soft shadow-md group-hover:block">
            {kpi.tooltip}
          </p>
        </div>
      ))}
    </div>
  );
}

function MiniBar({ value, benchmark }: { value: number; benchmark: { best: number; average: number; poor: number } }) {
  const min = Math.min(benchmark.best, value) * 0.9;
  const max = Math.max(benchmark.poor, value) * 1.1;
  const pct = (v: number) => Math.min(Math.max(((v - min) / (max - min)) * 100, 0), 100);

  return (
    <div className="relative h-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400">
      <div className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full border border-white bg-ink" style={{ left: `${pct(value)}%` }} />
    </div>
  );
}
