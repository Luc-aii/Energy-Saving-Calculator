import emissionFactors from "@data/emission_factors.json";
import carbonTaxSchedule from "@data/carbon_tax_schedule.json";
import grantsData from "@data/grants.json";
import tariffConfig from "@data/tariff_config.json";
import scope3Factors from "@data/scope3_factors.json";
import type { AssumptionLine } from "@/lib/types/results";
import type { SmeInputs } from "@/lib/types/inputs";

export const DATA_VERSION = "2.3.2";

function latestTariffPeriodLabel(): string {
  const quarters = tariffConfig.historicalQuarterly;
  const latest = quarters[quarters.length - 1];
  return latest ? `SP Group ${latest.period}` : `SP Group, updated ${tariffConfig.lastUpdated}`;
}

export function buildAssumptions(inputs: SmeInputs, tariff: number, savingRatePct: number, isLiable: boolean): AssumptionLine[] {
  const eeg = grantsData.grants.find((g) => g.id === "eeg-base")!;
  return [
    {
      label: "Grid Emission Factor",
      value: `${emissionFactors.electricity.singapore.gridEmissionFactorKgPerKwh} kg CO2/kWh`,
      source: emissionFactors.electricity.singapore.source,
    },
    {
      label: "Electricity Tariff",
      value: `S$${tariff.toFixed(4)}/kWh${inputs.sensitivity.tariffOverrideSgdPerKwh ? " (user override)" : ""}`,
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
    {
      label: "Current Rate (2024-2025)",
      value: `S$${carbonTaxSchedule.legislated["2025"]} per tCO2e`,
      source: "NEA / MSE Singapore",
    },
    {
      label: "Legislated Rate (2026-2027)",
      value: `S$${carbonTaxSchedule.legislated["2026"]} per tCO2e`,
      source: "NEA / MSE Singapore",
    },
    {
      label: "Indicative Rate (2030)",
      value: `S$${carbonTaxSchedule.indicative2030[inputs.carbonPriceScenario]} per tCO2e (${inputs.carbonPriceScenario})`,
      source: "NEA / MSE Singapore — indicative, not yet legislated",
    },
    {
      label: "Energy Saving Applied",
      value: `${(savingRatePct * 100).toFixed(0)}%${inputs.sensitivity.savingsRateOverridePct ? " (user override)" : ""}`,
      source: "EcoStruxure Building Operation — calibrated against sector benchmark position",
    },
    {
      label: "EEG Grant",
      value: `Up to S$${eeg.maxAmountSgd?.toLocaleString()} (${(eeg.coFundRate! * 100).toFixed(0)}% co-fund)`,
      source: `EnterpriseSG, valid to ${eeg.validUntil}`,
    },
    {
      label: "Scope 3 Method",
      value: "Spend-based (EEIO) — quantified only, not included in $ saving",
      source: scope3Factors.source,
    },
  ];
}
