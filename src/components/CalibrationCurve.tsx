import type { CalibrationCurve } from "@/lib/types/results";

export function CalibrationCurveChart({ curve }: { curve: CalibrationCurve }) {
  if (curve.yourValue === null) {
    return (
      <p className="text-xs text-ink-soft">
        Add your floor area to see how your energy intensity compares to the {curve.sector} sector.
      </p>
    );
  }

  const min = Math.min(curve.bestInClass, curve.yourValue) * 0.9;
  const max = Math.max(curve.poor, curve.yourValue) * 1.1;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400">
        <Marker pct={pct(curve.bestInClass)} label="Best" />
        <Marker pct={pct(curve.average)} label="Avg" />
        <Marker pct={pct(curve.poor)} label="Poor" />
        <Marker pct={pct(curve.yourValue)} label="You" emphasize />
      </div>
      <div className="mt-6 flex justify-between text-[10px] text-ink-soft">
        <span>{curve.bestInClass} {curve.unit}</span>
        <span>{curve.poor} {curve.unit}</span>
      </div>
    </div>
  );
}

function Marker({ pct, label, emphasize }: { pct: number; label: string; emphasize?: boolean }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div
      className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center"
      style={{ left: `${clamped}%` }}
    >
      <div
        className={
          emphasize
            ? "h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-ink shadow"
            : "h-2 w-0.5 -translate-x-1/2 bg-ink-soft"
        }
      />
      <span className={`mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] ${emphasize ? "font-bold text-ink" : "text-ink-soft"}`}>
        {label}
      </span>
    </div>
  );
}
