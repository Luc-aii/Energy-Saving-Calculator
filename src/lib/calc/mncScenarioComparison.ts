import type { CarbonPriceScenario } from "@/lib/types/inputs";
import type { MncInputs } from "@/lib/types/mncInputs";
import type { ScenarioSummary } from "@/lib/types/results";
import { calculateMnc } from "./mncEngine";

const SCENARIOS: CarbonPriceScenario[] = ["conservative", "base", "optimistic"];

/**
 * Runs the MNC engine once per scenario to produce a side-by-side comparison. The engine itself now
 * applies the savings-rate delta (via applySavingsRateDelta in sharedEngineHelpers), so this
 * function no longer needs to manually add it — just swap the scenario and re-run.
 */
export function compareMncScenarios(inputs: MncInputs): ScenarioSummary[] {
  return SCENARIOS.map((scenario) => {
    const scenarioInputs: MncInputs = {
      ...inputs,
      carbonPriceScenario: scenario,
    };
    const result = calculateMnc(scenarioInputs);

    return {
      scenario,
      savingsRateUsed: result.energySavingRatePct,
      year1TotalSgd: result.yearRows[0].totalSavingSgd,
      tenYearCumulativeSgd: result.yearRows[result.yearRows.length - 1].cumulativeSavingSgd,
      paybackYears: result.paybackYears,
    };
  });
}
