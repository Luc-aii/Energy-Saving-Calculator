import type { SmeInputs, CarbonPriceScenario } from "@/lib/types/inputs";
import type { ScenarioSummary } from "@/lib/types/results";
import { calculateSme } from "./engine";

const SCENARIOS: CarbonPriceScenario[] = ["conservative", "base", "optimistic"];

/**
 * Runs the engine once per scenario to produce a side-by-side comparison. The engine itself now
 * applies the savings-rate delta (via applySavingsRateDelta in sharedEngineHelpers), so this
 * function no longer needs to manually add it — just swap the scenario and re-run.
 */
export function compareScenarios(inputs: SmeInputs): ScenarioSummary[] {
  return SCENARIOS.map((scenario) => {
    const scenarioInputs: SmeInputs = {
      ...inputs,
      carbonPriceScenario: scenario,
    };
    const result = calculateSme(scenarioInputs);

    return {
      scenario,
      savingsRateUsed: result.energySavingRatePct,
      year1TotalSgd: result.yearRows[0].totalSavingSgd,
      tenYearCumulativeSgd: result.yearRows[result.yearRows.length - 1].cumulativeSavingSgd,
      paybackYears: result.paybackYears,
    };
  });
}
