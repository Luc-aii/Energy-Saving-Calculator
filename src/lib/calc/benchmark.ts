import sectorBenchmarks from "@data/sector_benchmarks.json";
import type { Sector } from "@/lib/types/inputs";
import type { CalibrationCurve } from "@/lib/types/results";

interface SavingRateResult {
  savingRatePct: number;
  positionLabel: string;
}

/**
 * Data Centre's benchmark is a PUE ratio (1.2-2.0), not kWh/m²/year like
 * every other sector — comparing our computed kWh/m² intensity against it
 * directly would be an apples-to-oranges unit mismatch (a real data centre's
 * kWh/m² is routinely 1,000+, which isn't meaningfully "worse" than a PUE
 * band). We don't collect the IT-load split needed to compute a true PUE, so
 * for that sector we skip the numeric comparison entirely rather than
 * silently comparing across units.
 */
function hasComparableBenchmark(band: object | undefined): boolean {
  if (!band) return false;
  return !("unit" in band) || (band as { unit?: string }).unit === sectorBenchmarks.unit;
}

export function getCalibrationCurve(sector: Sector, energyIntensityKwhPerM2: number | null): CalibrationCurve {
  const band = sectorBenchmarks.sectors[sector as keyof typeof sectorBenchmarks.sectors];
  const comparable = hasComparableBenchmark(band);
  return {
    sector,
    unit: comparable ? sectorBenchmarks.unit : ((band as { unit?: string })?.unit ?? sectorBenchmarks.unit),
    bestInClass: band.bestInClass,
    average: band.average,
    poor: band.poor,
    // Not plotted when the sector's own benchmark isn't on a comparable scale (e.g. Data Centre's PUE).
    yourValue: comparable ? energyIntensityKwhPerM2 : null,
  };
}

/** Anomaly check per PRD section 17.2/8: flags raw intensity input far outside the sector band. */
export function checkIntensityAnomaly(sector: Sector, energyIntensityKwhPerM2: number | null): string | null {
  const band = sectorBenchmarks.sectors[sector as keyof typeof sectorBenchmarks.sectors];
  if (!hasComparableBenchmark(band) || energyIntensityKwhPerM2 === null) return null;
  if (energyIntensityKwhPerM2 > band.poor * 2) {
    return `Your energy intensity is more than 2x the "poor" band for ${sector} — please double-check your kWh and floor area entries.`;
  }
  if (energyIntensityKwhPerM2 < band.bestInClass * 0.5) {
    return `Your energy intensity is less than half the "best-in-class" band for ${sector} — please double-check your kWh and floor area entries.`;
  }
  return null;
}

/**
 * Maps a company's energy intensity (kWh/m2/year) against its sector's
 * best-in-class / average / poor bands to pick a realistic EBO savings %.
 * Logic per PRD section 17.2: further from best-in-class = higher upside.
 */
export function estimateSavingsRate(
  sector: Sector,
  energyIntensityKwhPerM2: number | null
): SavingRateResult {
  const band = sectorBenchmarks.sectors[sector as keyof typeof sectorBenchmarks.sectors];

  if (!hasComparableBenchmark(band)) {
    return {
      savingRatePct: 0.22,
      positionLabel: `Sector average assumed (${sector} is benchmarked in ${(band as { unit?: string })?.unit ?? "different units"}, not kWh/m² — not directly comparable without IT-load data)`,
    };
  }
  if (energyIntensityKwhPerM2 === null) {
    return { savingRatePct: 0.22, positionLabel: "Sector average assumed (no floor area provided)" };
  }

  const { bestInClass, average, poor } = band;

  if (energyIntensityKwhPerM2 <= bestInClass * 1.1) {
    return { savingRatePct: 0.08, positionLabel: "Near best-in-class — limited upside on energy efficiency" };
  }
  if (energyIntensityKwhPerM2 >= poor * 0.9) {
    return { savingRatePct: 0.28, positionLabel: "Worst quartile of sector — high savings potential" };
  }
  if (energyIntensityKwhPerM2 >= average) {
    // Between average and poor: interpolate 15%-28%
    const progress = (energyIntensityKwhPerM2 - average) / (poor - average);
    return {
      savingRatePct: 0.15 + progress * (0.28 - 0.15),
      positionLabel: "Above sector average energy intensity",
    };
  }
  // Between best-in-class and average: interpolate 8%-22%
  const progress = (energyIntensityKwhPerM2 - bestInClass) / (average - bestInClass);
  return {
    savingRatePct: 0.08 + progress * (0.22 - 0.08),
    positionLabel: "Better than sector average energy intensity",
  };
}
