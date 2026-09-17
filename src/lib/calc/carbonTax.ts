import carbonTaxSchedule from "@data/carbon_tax_schedule.json";
import type { CarbonPriceScenario } from "@/lib/types/inputs";

const legislated = carbonTaxSchedule.legislated as Record<string, number>;
const lastLegislatedYear = Math.max(...Object.keys(legislated).map(Number));
const lastLegislatedRate = legislated[String(lastLegislatedYear)];

/**
 * Returns the carbon tax rate (S$/tCO2e) for a given calendar year.
 * 2024-2027 are legislated. 2028-2029 are linearly interpolated toward
 * the 2030 indicative rate for the chosen scenario. 2030+ holds flat.
 */
export function carbonTaxRateForYear(
  calendarYear: number,
  scenario: CarbonPriceScenario
): number {
  const legislatedRate = legislated[String(calendarYear)];
  if (legislatedRate !== undefined) return legislatedRate;

  const target2030 = carbonTaxSchedule.indicative2030[scenario];

  if (calendarYear <= lastLegislatedYear) return lastLegislatedRate;
  if (calendarYear >= 2030) return target2030;

  const span = 2030 - lastLegislatedYear;
  const progress = (calendarYear - lastLegislatedYear) / span;
  return lastLegislatedRate + (target2030 - lastLegislatedRate) * progress;
}
