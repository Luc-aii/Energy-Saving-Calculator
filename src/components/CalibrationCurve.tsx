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
    // pt-3: the emphasized "You" dot is taller (h-4) than the bar it centers on (h-2), so it overflows
    // ~4px above the bar. Without this clearance the dot visually clashes with whatever text sits above
    // this component (caller-supplied margin isn't reliable since it doesn't account for the marker's
    // own overflow) — this keeps the chart safe regardless of where it's dropped in.
    <div className="pt-3">
      <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400">
        <Marker pct={pct(curve.bestInClass)} label="Best" />
        <Marker pct={pct(curve.average)} label="Avg" />
        <Marker pct={pct(curve.poor)} label="Poor" />
        <Marker pct={pct(curve.yourValue)} label="You" sublabel={`${curve.yourValue} ${curve.unit}`} emphasize />
      </div>
      {/* mt-10: clears the two-line "You" label (name + kWh/m² sublabel) sitting below the bar — mt-6
          was sized for the single-line Best/Avg/Poor labels and started clipping into "You" once its
          vertical anchoring was fixed to sit level with the others. */}
      <div className="mt-10 flex justify-between text-[10px] text-ink-soft">
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
    // No -translate-y-1/2 (and no flex column) on this outer anchor — that was centering the whole
    // label stack, so "You" (two lines: label + sublabel) sat visibly higher than Best/Avg/Poor
    // (one line), since half of a taller stack is a bigger upward offset. The dot/tick below centers
    // itself independently, so it lands exactly on the bar's centerline no matter how tall the label
    // stack underneath it is.
    <div className="absolute top-1/2" style={{ left: `${clamped}%` }}>
      <div
        className={
          emphasize
            ? "h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow"
            : "h-2 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-ink-soft"
        }
      />
      <div className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap text-center">
        <span className={`block text-[10px] ${emphasize ? "font-bold text-ink" : "text-ink-soft"}`}>
          {label}
          {offScale ? "*" : ""}
        </span>
        {sublabel && <span className="block text-[10px] text-ink-soft">{sublabel}</span>}
      </div>
    </div>
  );
}
