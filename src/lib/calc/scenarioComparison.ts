import type { SmeInputs, CarbonPriceScenario } from "@/lib/types/inputs";
import type { ScenarioSummary } from "@/lib/types/results";
import { calculateSme } from "./engine";

const SCENARIOS: CarbonPriceScenario[] = ["conservative", "base", "optimistic"];
/** Conservative/optimistic also swing the savings-rate assumption per PRD section 6.4. */
const SAVINGS_RATE_DELTA: Record<CarbonPriceScenario, number> = {
  conservative: -0.07,
  base: 0,
  optimistic: 0.08,
};

export function compareScenarios(inputs: SmeInputs): ScenarioSummary[] {
  return SCENARIOS.map((scenario) => {
    const baseRate = inputs.sensitivity.savingsRateOverridePct;
    const scenarioInputs: SmeInputs = {
      ...inputs,
      carbonPriceScenario: scenario,
      sensitivity: {
        ...inputs.sensitivity,
        savingsRateOverridePct: undefined,
      },
    };
    const result = calculateSme(scenarioInputs);
    const adjustedRate = Math.max((baseRate ?? result.energySavingRatePct) + SAVINGS_RATE_DELTA[scenario], 0.02);
    const finalInputs: SmeInputs = {
      ...scenarioInputs,
      sensitivity: { ...scenarioInputs.sensitivity, savingsRateOverridePct: adjustedRate },
    };
    const finalResult = calculateSme(finalInputs);

    return {
      scenario,
      savingsRateUsed: adjustedRate,
      year1TotalSgd: finalResult.yearRows[0].totalSavingSgd,
      tenYearCumulativeSgd: finalResult.yearRows[finalResult.yearRows.length - 1].cumulativeSavingSgd,
      paybackYears: finalResult.paybackYears,
    };
  });
}
