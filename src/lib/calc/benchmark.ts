import sectorBenchmarks from "@data/sector_benchmarks.json";
import type { Sector } from "@/lib/types/inputs";
import type { CalibrationCurve } from "@/lib/types/results";

interface SavingRateResult {
  savingRatePct: number;
  positionLabel: string;
}

interface Band {
  bestInClass: number;
  average: number;
  poor: number;
  unit?: string;
  note?: string;
}

function isFlatBand(x: unknown): x is Band {
  return typeof x === "object" && x !== null && "bestInClass" in x;
}

/**
 * Resolves a sector's benchmark band, applying the sub-profile when the
 * sector has genuinely different variants (Retail "supermarket" vs the
 * general-merchandise default, Logistics "coldStorage" vs ambient) — without
 * this, a supermarket or cold-chain client was always benchmarked against
 * the wrong baseline and looked "worst quartile" no matter how efficient
 * they actually were (usability finding M2).
 */
export function resolveBand(sector: Sector, subProfile?: string): Band | undefined {
  const raw = sectorBenchmarks.sectors[sector as keyof typeof sectorBenchmarks.sectors] as unknown;
  if (!raw) return undefined;
  if (isFlatBand(raw)) return raw;
  const variants = raw as Record<string, Band>;
  const variant = subProfile && subProfile in variants ? subProfile : "default";
  return variants[variant] ?? variants.default;
}

/**
 * Data Centre's benchmark is a PUE ratio, not kWh/m²/year like every other
 * sector — comparing a raw kWh/m² intensity against it directly would be an
 * apples-to-oranges unit mismatch. If the user has supplied an IT-load
 * figure (see MncSite/BlockAEnergy "itLoadKwh") we can compute a genuine PUE
 * and compare that instead (usability finding M5); otherwise we fall back to
 * a sector-average assumption rather than silently comparing across units.
 */
function hasOwnUnit(band: Band): boolean {
  return Boolean(band.unit) && band.unit !== sectorBenchmarks.unit;
}

function resolveComparisonValue(band: Band, energyIntensityKwhPerM2: number | null, pue: number | null | undefined): number | null {
  return hasOwnUnit(band) ? pue ?? null : energyIntensityKwhPerM2;
}

export function getCalibrationCurve(
  sector: Sector,
  energyIntensityKwhPerM2: number | null,
  subProfile?: string,
  pue?: number | null
): CalibrationCurve {
  const band = resolveBand(sector, subProfile);
  if (!band) return { sector, unit: sectorBenchmarks.unit, bestInClass: 0, average: 0, poor: 0, yourValue: null };
  return {
    sector,
    unit: band.unit ?? sectorBenchmarks.unit,
    bestInClass: band.bestInClass,
    average: band.average,
    poor: band.poor,
    yourValue: resolveComparisonValue(band, energyIntensityKwhPerM2, pue),
  };
}

/**
 * Rough annual electricity estimate from floor area (GFA) × the sector's
 * average energy intensity — a last-resort fallback for a company that
 * doesn't have a bill or spend figure handy but does know its floor area.
 * Returns null where that's not a meaningful estimate: no floor area given,
 * no sourced band for the sector, or a sector benchmarked in a different
 * unit entirely (Data Centre's PUE, which floor area has no bearing on).
 */
export function estimateAnnualKwhFromFloorArea(sector: Sector, subProfile: string | undefined, floorAreaM2: number): number | null {
  if (floorAreaM2 <= 0) return null;
  const band = resolveBand(sector, subProfile);
  if (!band || hasOwnUnit(band)) return null;
  return floorAreaM2 * band.average;
}

/** Anomaly check per PRD section 17.2/8: flags raw intensity input far outside the sector band. */
export function checkIntensityAnomaly(
  sector: Sector,
  energyIntensityKwhPerM2: number | null,
  subProfile?: string,
  pue?: number | null
): string | null {
  const band = resolveBand(sector, subProfile);
  if (!band) return null;
  const value = resolveComparisonValue(band, energyIntensityKwhPerM2, pue);
  if (value === null) return null;
  const label = hasOwnUnit(band) ? band.unit! : "energy intensity";
  if (value > band.poor * 2) {
    return `Your ${label} is more than 2x the "poor" band for ${sector} — please double-check your inputs.`;
  }
  if (value < band.bestInClass * 0.5) {
    return `Your ${label} is less than half the "best-in-class" band for ${sector} — please double-check your inputs.`;
  }
  return null;
}

/**
 * Maps a company's energy intensity (kWh/m2/year, or PUE for Data Centre
 * when IT load is known) against its sector's best-in-class / average /
 * poor bands to pick a realistic EBO savings %. Logic per PRD section 17.2:
 * further from best-in-class = higher upside.
 */
export function estimateSavingsRate(
  sector: Sector,
  energyIntensityKwhPerM2: number | null,
  subProfile?: string,
  pue?: number | null
): SavingRateResult {
  const band = resolveBand(sector, subProfile);
  if (!band) return { savingRatePct: 0.22, positionLabel: "Sector average assumed" };

  const ownUnit = hasOwnUnit(band);
  const value = resolveComparisonValue(band, energyIntensityKwhPerM2, pue);

  if (value === null) {
    return {
      savingRatePct: 0.22,
      positionLabel: ownUnit
        ? `Sector average assumed (${sector} is benchmarked in ${band.unit} — add your IT load to compare on a true PUE basis)`
        : "Sector average assumed (no floor area provided)",
    };
  }

  const { bestInClass, average, poor } = band;

  if (value <= bestInClass * 1.1) {
    return { savingRatePct: 0.08, positionLabel: "Near best-in-class — limited upside on energy efficiency" };
  }
  if (value >= poor * 0.9) {
    return { savingRatePct: 0.28, positionLabel: "Worst quartile of sector — high savings potential" };
  }
  if (value >= average) {
    // Between average and poor: interpolate 15%-28%
    const progress = (value - average) / (poor - average);
    return {
      savingRatePct: 0.15 + progress * (0.28 - 0.15),
      positionLabel: "Above sector average energy intensity",
    };
  }
  // Between best-in-class and average: interpolate 8%-22%
  const progress = (value - bestInClass) / (average - bestInClass);
  return {
    savingRatePct: 0.08 + progress * (0.22 - 0.08),
    positionLabel: "Better than sector average energy intensity",
  };
}
