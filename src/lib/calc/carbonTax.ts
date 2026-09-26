import carbonTaxSchedule from "@data/carbon_tax_schedule.json";
import type { CarbonPriceScenario } from "@/lib/types/inputs";

const legislated = carbonTaxSchedule.legislated as Record<string, number>;
const legislatedYears = Object.keys(legislated).map(Number);
const firstLegislatedYear = Math.min(...legislatedYears);
const firstLegislatedRate = legislated[String(firstLegislatedYear)];
const lastLegislatedYear = Math.max(...legislatedYears);
const lastLegislatedRate = legislated[String(lastLegislatedYear)];

/**
 * Returns the carbon tax rate (S$/tCO2e) for a given calendar year.
 * Before the first legislated year holds flat at that year's rate (mirrors
 * the 2030+ flat extrapolation, symmetrically). 2024-2027 are legislated.
 * 2028-2029 are linearly interpolated toward the 2030 indicative rate for
 * the chosen scenario. 2030+ holds flat.
 */
export function carbonTaxRateForYear(
  calendarYear: number,
  scenario: CarbonPriceScenario
): number {
  const legislatedRate = legislated[String(calendarYear)];
  if (legislatedRate !== undefined) return legislatedRate;

  // Every legislated year already returned above, so reaching here at/before the last legislated
  // year only happens for a year before the schedule begins (e.g. 2019) — previously this fell through
  // to the "at/after 2030" branch's `lastLegislatedRate` by an off-by-direction bug, returning the
  // FINAL (highest) legislated rate for a year that predates the whole schedule. Currently unreachable
  // from the live app (calendarYear is always >= today's year, which is already inside/after the
  // legislated window) but is a real defect if this function is ever called with an earlier year.
  if (calendarYear < firstLegislatedYear) return firstLegislatedRate;

  const target2030 = carbonTaxSchedule.indicative2030[scenario];

  if (calendarYear <= lastLegislatedYear) return lastLegislatedRate;
  if (calendarYear >= 2030) return target2030;

  const span = 2030 - lastLegislatedYear;
  const progress = (calendarYear - lastLegislatedYear) / span;
  return lastLegislatedRate + (target2030 - lastLegislatedRate) * progress;
}
