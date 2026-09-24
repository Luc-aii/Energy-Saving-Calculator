import type { CalibrationCurve } from "@/lib/types/results";

export function CalibrationCurveChart({ curve }: { curve: CalibrationCurve }) {
  if (curve.yourValue === null) {
    return (
      <p className="text-xs text-ink-soft">
        Add your floor area to see how your energy intensity compares to the {curve.sector} sector.
      </p>
    );
  }

  // Scale is anchored to the sector benchmark band (best..poor), not the company's own value —
  // otherwise an outlier "yourValue" (far better or far worse than the sector range) stretches the
  // axis so much that Best/Avg/Poor collapse on top of each other near one edge. "You" is clamped
  // into the bar instead and the axis labels stay truthful to the sector numbers actually printed.
  const min = curve.bestInClass * 0.9;
  const max = curve.poor * 1.1;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400">
        <Marker pct={pct(curve.bestInClass)} label="Best" />
        <Marker pct={pct(curve.average)} label="Avg" />
        <Marker pct={pct(curve.poor)} label="Poor" />
        <Marker pct={pct(curve.yourValue)} label="You" sublabel={`${curve.yourValue} ${curve.unit}`} emphasize />
      </div>
      <div className="mt-6 flex justify-between text-[10px] text-ink-soft">
        <span>{curve.bestInClass} {curve.unit}</span>
        <span>{curve.poor} {curve.unit}</span>
      </div>
      {(curve.yourValue < min || curve.yourValue > max) && (
        <p className="mt-1 text-[10px] text-ink-soft">* Your value is outside the sector&apos;s best-to-poor range shown here; position pinned to the nearest edge.</p>
      )}
    </div>
  );
}

function Marker({ pct, label, sublabel, emphasize }: { pct: number; label: string; sublabel?: string; emphasize?: boolean }) {
  const offScale = pct < 0 || pct > 100;
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
        {offScale ? "*" : ""}
      </span>
      {sublabel && (
        <span className="-translate-x-1/2 whitespace-nowrap text-[10px] text-ink-soft">{sublabel}</span>
      )}
    </div>
  );
}
