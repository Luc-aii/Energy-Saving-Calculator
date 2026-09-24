import type { EnergyEndUseItem } from "@/lib/types/results";

/** Ties the sector-driven tailoring together for the user — shown wherever the energy end-use chart appears. */
export function SectorSpotlight({ sector, topEndUse }: { sector: string; topEndUse: EnergyEndUseItem | null }) {
  if (!topEndUse) return null;
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 p-2.5 text-xs text-brand-800">
      <span aria-hidden="true">🎯</span>
      <p>
        <span className="font-semibold">{sector}</span> businesses are typically driven by{" "}
        <span className="font-semibold">{topEndUse.label}</span> (~{topEndUse.pct.toFixed(0)}% of energy) — we&apos;ve highlighted it
        below and prioritized related Energy Conservation Measures for you.
      </p>
    </div>
  );
}
