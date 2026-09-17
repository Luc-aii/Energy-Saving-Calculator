import emissionFactors from "@data/emission_factors.json";
import carbonTaxSchedule from "@data/carbon_tax_schedule.json";
import type { AssumptionLine } from "@/lib/types/results";
import type { MncInputs } from "@/lib/types/mncInputs";

export const MNC_DATA_VERSION = "2.3.1";

export function buildMncAssumptions(inputs: MncInputs, weightedTariff: number, savingRatePct: number, isLiable: boolean): AssumptionLine[] {
  return [
    {
      label: "Grid Emission Factor",
      value: `${emissionFactors.electricity.singapore.gridEmissionFactorKgPerKwh} kg CO2/kWh`,
      source: emissionFactors.electricity.singapore.source,
    },
    {
      label: "Weighted-average electricity tariff",
      value: `S$${weightedTariff.toFixed(4)}/kWh across ${inputs.sites.length} site(s)`,
      source: "Per-site contract rates where entered; SP Group reference tariff otherwise",
    },
    {
      label: "Carbon tax liability",
      value: isLiable ? "Direct taxpayer — Scope 1 ≥ 25,000 tCO2e/year or self-reported IRAS exposure" : "Not a direct taxpayer (pass-through only)",
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
      value: `${(savingRatePct * 100).toFixed(0)}%`,
      source: "EcoStruxure Building Operation — calibrated against portfolio-wide energy intensity",
    },
    {
      label: "Scope 3 Method",
      value: "Spend-based (Cat 1/4/9 fallback) + activity-based (Cat 4/6/7/9 where provided) — quantified only",
      source: "DEFRA 2026 / US EPA EEIO v2.0",
    },
    {
      label: "Grant treatment",
      value: "No EEG grant auto-applied — MNC scale falls under EEG Advanced, which the PRD defines as project-dependent quantum",
      source: "EnterpriseSG — confirm case-by-case",
    },
  ];
}
