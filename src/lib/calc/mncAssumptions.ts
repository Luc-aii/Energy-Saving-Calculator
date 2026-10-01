import emissionFactors from "@data/emission_factors.json";
import carbonTaxSchedule from "@data/carbon_tax_schedule.json";
import tariffConfig from "@data/tariff_config.json";
import sectorEnergyEndUse from "@data/sector_energy_enduse.json";
import type { AssumptionLine } from "@/lib/types/results";
import type { MncInputs } from "@/lib/types/mncInputs";
import { currentAndPreviousLegislatedBrackets } from "./assumptions";

export const MNC_DATA_VERSION = "2.3.1";

export function buildMncAssumptions(inputs: MncInputs, weightedTariff: number, weightedGef: number, savingRatePct: number, isLiable: boolean): AssumptionLine[] {
  const anySiteGefOverride = inputs.sites.some((s) => s.gridEmissionFactorOverrideKgPerKwh !== undefined) || inputs.defaultGridEmissionFactorOverrideKgPerKwh !== undefined;
  const { current: currentBracket, previous: previousBracket } = currentAndPreviousLegislatedBrackets();
  const anySiteRenewable = inputs.sites.some((s) => s.renewableCoveragePct > 0);
  return [
    {
      label: "Grid Emission Factor",
      value: `${weightedGef.toFixed(4)} kg CO2/kWh (kWh-weighted across sites)${anySiteGefOverride ? " — includes user overrides" : ""}`,
      source: anySiteGefOverride ? "EMA Singapore reference plus per-site user overrides where entered" : emissionFactors.electricity.singapore.source,
    },
    {
      label: "Weighted-average electricity tariff",
      value: `S$${weightedTariff.toFixed(4)}/kWh across ${inputs.sites.length} site(s)`,
      source: "Per-site contract rates where entered; portfolio default or SP Group reference tariff otherwise",
    },
    ...(anySiteRenewable
      ? [
          {
            label: "Renewable Coverage / Green Tariff Premium",
            value: "One or more sites carry a renewable (REC/PPA/green tariff) coverage % — see per-site breakdown",
            source: tariffConfig.greenPremium.source,
          } satisfies AssumptionLine,
        ]
      : []),
    {
      label: "Energy End-Use Breakdown",
      value: sectorEnergyEndUse.sectors[inputs.sector as keyof typeof sectorEnergyEndUse.sectors]
        ? "Sector-typical split shown"
        : "Not available for this sector",
      source: sectorEnergyEndUse.source,
    },
    {
      label: "Carbon tax liability",
      value: isLiable ? "Direct taxpayer — Scope 1 ≥ 25,000 tCO2e/year or self-reported IRAS exposure" : "Not a direct taxpayer (pass-through only)",
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
        : "Energy Conservation Measures catalog, net of measures already implemented — see data/ecm_catalog.json",
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
