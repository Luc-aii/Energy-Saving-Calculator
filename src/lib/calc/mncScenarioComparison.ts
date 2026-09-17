import type { CarbonPriceScenario } from "@/lib/types/inputs";
import type { MncInputs } from "@/lib/types/mncInputs";
import type { ScenarioSummary } from "@/lib/types/results";
import { calculateMnc } from "./mncEngine";

const SCENARIOS: CarbonPriceScenario[] = ["conservative", "base", "optimistic"];
const SAVINGS_RATE_DELTA: Record<CarbonPriceScenario, number> = {
  conservative: -0.07,
  base: 0,
  optimistic: 0.08,
};

export function compareMncScenarios(inputs: MncInputs): ScenarioSummary[] {
  return SCENARIOS.map((scenario) => {
    const baseRate = inputs.sensitivity.savingsRateOverridePct;
    const probeInputs: MncInputs = {
      ...inputs,
      carbonPriceScenario: scenario,
      sensitivity: { ...inputs.sensitivity, savingsRateOverridePct: undefined },
    };
    const probeResult = calculateMnc(probeInputs);
    const adjustedRate = Math.max((baseRate ?? probeResult.energySavingRatePct) + SAVINGS_RATE_DELTA[scenario], 0.02);
    const finalInputs: MncInputs = {
      ...probeInputs,
      sensitivity: { ...probeInputs.sensitivity, savingsRateOverridePct: adjustedRate },
    };
    const finalResult = calculateMnc(finalInputs);

    return {
      scenario,
      savingsRateUsed: adjustedRate,
      year1TotalSgd: finalResult.yearRows[0].totalSavingSgd,
      tenYearCumulativeSgd: finalResult.yearRows[finalResult.yearRows.length - 1].cumulativeSavingSgd,
      paybackYears: finalResult.paybackYears,
    };
  });
}
