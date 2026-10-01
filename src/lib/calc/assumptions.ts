import emissionFactors from "@data/emission_factors.json";
import carbonTaxSchedule from "@data/carbon_tax_schedule.json";
import grantsData from "@data/grants.json";
import tariffConfig from "@data/tariff_config.json";
import scope3Factors from "@data/scope3_factors.json";
import sectorEnergyEndUse from "@data/sector_energy_enduse.json";
import type { AssumptionLine } from "@/lib/types/results";
import type { SmeInputs } from "@/lib/types/inputs";

export const DATA_VERSION = "2.3.2";

function latestTariffPeriodLabel(): string {
  const quarters = tariffConfig.historicalQuarterly;
  const latest = quarters[quarters.length - 1];
  return latest ? `SP Group ${latest.period}` : `SP Group, updated ${tariffConfig.lastUpdated}`;
}

/**
 * The legislated schedule is keyed by individual calendar year, not a fixed "2024-2025" / "2026-2027"
 * pair — hardcoding those two labels meant the table kept calling 2024-25 the "current" rate long after
 * the 2026-27 rate actually took effect (caught in review, October 2026). Finds today's actual bracket
 * and the one before it instead, so the labels stay correct as the schedule's own years roll forward.
 */
export function currentAndPreviousLegislatedBrackets(): { current: { years: string; rate: number }; previous: { years: string; rate: number } | null } {
  const legislated = carbonTaxSchedule.legislated as Record<string, number>;
  const years = Object.keys(legislated).map(Number).sort((a, b) => a - b);
  const todayYear = new Date().getFullYear();
  // The bracket containing today's year, or the last legislated bracket if today is beyond it.
  const currentYear = years.find((y) => y >= todayYear) ?? years[years.length - 1];
  const currentRate = legislated[String(currentYear)];
  const sameRateYears = years.filter((y) => legislated[String(y)] === currentRate);
  const currentLabel =
    sameRateYears.length > 1 ? `${sameRateYears[0]}-${sameRateYears[sameRateYears.length - 1]}` : String(currentYear);

  const earlierYears = years.filter((y) => !sameRateYears.includes(y));
  if (earlierYears.length === 0) return { current: { years: currentLabel, rate: currentRate }, previous: null };
  const previousRate = legislated[String(earlierYears[earlierYears.length - 1])];
  const previousSameRateYears = earlierYears.filter((y) => legislated[String(y)] === previousRate);
  const previousLabel =
    previousSameRateYears.length > 1
      ? `${previousSameRateYears[0]}-${previousSameRateYears[previousSameRateYears.length - 1]}`
      : String(previousSameRateYears[0]);
  return { current: { years: currentLabel, rate: currentRate }, previous: { years: previousLabel, rate: previousRate } };
}

/** Which of Scope 3's two calculation methods actually contributed a nonzero figure for this result — "Spend-based (EEIO)" alone was shown unconditionally even when the only Scope 3 line was commuting (activity-based), contradicting the report's own Scope 3 table (caught in review, October 2026). */
function scope3MethodLine(activityBasedTCo2e: number, spendBasedTCo2e: number): { value: string; source: string } {
  const hasActivity = activityBasedTCo2e > 0;
  const hasSpend = spendBasedTCo2e > 0;
  if (hasActivity && hasSpend) {
    return {
      value: "Mixed — activity-based (commuting/flights: distance × mode factor) and spend-based (EEIO) for freight/purchased goods — quantified only, not included in $ saving",
      source: scope3Factors.source,
    };
  }
  if (hasActivity) {
    return {
      value: "Activity-based (commuting distance × mode factor, and/or flights: passenger-km × factor) — quantified only, not included in $ saving; spend-based EEIO used only where freight/purchased-goods spend is entered",
      source: scope3Factors.source,
    };
  }
  if (hasSpend) {
    return { value: "Spend-based (EEIO) — quantified only, not included in $ saving", source: scope3Factors.source };
  }
  return { value: "No Scope 3 data entered", source: scope3Factors.source };
}

export function buildAssumptions(
  inputs: SmeInputs,
  tariff: number,
  gef: number,
  savingRatePct: number,
  isLiable: boolean,
  scope3Methods: { activityBasedTCo2e: number; spendBasedTCo2e: number }
): AssumptionLine[] {
  const eeg = grantsData.grants.find((g) => g.id === "eeg-base")!;
  const { current: currentBracket, previous: previousBracket } = currentAndPreviousLegislatedBrackets();
  return [
    {
      label: "Grid Emission Factor",
      value: `${gef} kg CO2/kWh${inputs.energy.gridEmissionFactorOverrideKgPerKwh !== undefined ? " (user override)" : ""}`,
      source: inputs.energy.gridEmissionFactorOverrideKgPerKwh !== undefined ? "User-entered" : emissionFactors.electricity.singapore.source,
    },
    {
      label: "Electricity Tariff",
      value: `S$${tariff.toFixed(4)}/kWh${inputs.energy.tariffOverrideSgdPerKwh ? " (user override)" : ""}`,
      source: latestTariffPeriodLabel(),
    },
    {
      label: "Diesel Emission Factor",
      value: `${emissionFactors.fuels.dieselKgCo2ePerLitre} kg CO2e/litre`,
      source: emissionFactors.fuels.source,
    },
    {
      label: "Carbon tax liability",
      value: isLiable ? "Direct taxpayer — Scope 1 ≥ 25,000 tCO2e/year" : "Not a direct taxpayer (pass-through only)",
      source: "NEA Carbon Pricing Act — applies to direct (Scope 1) emitters only, ~50 facilities nationally",
    },
    ...(previousBracket
      ? [
          {
            label: `Previous Rate (${previousBracket.years})`,
            value: `S$${previousBracket.rate} per tCO2e`,
            source: "NEA / MSE Singapore",
          } satisfies AssumptionLine,
        ]
      : []),
    {
      label: `Current Rate (${currentBracket.years})`,
      value: `S$${currentBracket.rate} per tCO2e`,
      source: "NEA / MSE Singapore",
    },
    {
      label: "Indicative Rate (2030)",
      value: `S$${carbonTaxSchedule.indicative2030[inputs.carbonPriceScenario]} per tCO2e (${inputs.carbonPriceScenario})`,
      source: "NEA / MSE Singapore — indicative, not yet legislated",
    },
    {
      label: "Energy Saving Applied",
      value: `${(savingRatePct * 100).toFixed(0)}%${
        inputs.sensitivity.savingsRateOverridePct ? " (user override)" : " (bottom-up from your sector's remaining Energy Conservation Measures)"
      }`,
      source: inputs.sensitivity.savingsRateOverridePct
        ? "User override"
        : "Energy Conservation Measures catalog, net of measures already implemented",
    },
    {
      label: "EEG Grant",
      value: `Up to S$${eeg.maxAmountSgd?.toLocaleString()} (${(eeg.coFundRate! * 100).toFixed(0)}% co-fund) — informational only, NOT included in the $ savings/payback above (case-by-case eligibility)`,
      source: `EnterpriseSG, valid to ${eeg.validUntil}`,
    },
    {
      label: "Scope 3 Method",
      ...scope3MethodLine(scope3Methods.activityBasedTCo2e, scope3Methods.spendBasedTCo2e),
    },
    ...(inputs.energy.renewableCoveragePct
      ? [
          {
            label: "Renewable Coverage / Green Tariff Premium",
            value: `${Math.min(Math.max(inputs.energy.renewableCoveragePct, 0), 100).toFixed(0)}% at +S$${(
              inputs.energy.greenTariffPremiumOverrideSgdPerKwh ?? tariffConfig.greenPremium.typicalSgdPerKwh
            ).toFixed(4)}/kWh${inputs.energy.greenTariffPremiumOverrideSgdPerKwh ? " (user override)" : ""}`,
            source: tariffConfig.greenPremium.source,
          } satisfies AssumptionLine,
        ]
      : []),
    {
      label: "Energy End-Use Breakdown",
      value: sectorEnergyEndUse.sectors[inputs.universal.sector as keyof typeof sectorEnergyEndUse.sectors]
        ? `Sector-typical split shown${inputs.energy.customEndUsePct ? " (user-adjusted)" : ""}`
        : "Not available for this sector",
      source: sectorEnergyEndUse.source,
    },
  ];
}
