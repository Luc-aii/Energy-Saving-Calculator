import emissionFactors from "@data/emission_factors.json";
import tariffConfig from "@data/tariff_config.json";
import scope3Factors from "@data/scope3_factors.json";
import fuelPrices from "@data/fuel_prices.json";
import type { StalenessWarning } from "@/lib/types/results";

function monthsSince(dateStr: string, now: Date): number {
  const then = new Date(dateStr);
  return (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
}

/** Thresholds per PRD section 16.4. */
export function checkStaleness(now: Date = new Date()): StalenessWarning[] {
  const checks: { dataset: string; lastUpdated: string; thresholdMonths: number }[] = [
    { dataset: "Grid Emission Factor (GEF)", lastUpdated: emissionFactors.lastUpdated, thresholdMonths: 13 },
    { dataset: "SP Group electricity tariff", lastUpdated: tariffConfig.lastUpdated, thresholdMonths: 4 },
    { dataset: "DEFRA Scope 3 factors", lastUpdated: scope3Factors.lastUpdated, thresholdMonths: 14 },
    { dataset: "Fuel pump prices", lastUpdated: fuelPrices.lastUpdated, thresholdMonths: 3 },
  ];

  const warnings: StalenessWarning[] = [];
  for (const c of checks) {
    const months = monthsSince(c.lastUpdated, now);
    if (months > c.thresholdMonths) {
      warnings.push({ dataset: c.dataset, lastUpdated: c.lastUpdated, monthsSinceUpdate: months, thresholdMonths: c.thresholdMonths });
    }
  }
  return warnings;
}
