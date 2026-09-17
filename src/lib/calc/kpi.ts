import sectorBenchmarks from "@data/sector_benchmarks.json";
import emissionFactors from "@data/emission_factors.json";
import type { Sector } from "@/lib/types/inputs";
import type { KpiItem } from "@/lib/types/results";

const GEF = emissionFactors.electricity.singapore.gridEmissionFactorKgPerKwh;

export interface KpiInputs {
  sector: Sector;
  energyIntensityKwhPerM2: number | null;
  totalScope12TCo2e: number;
  totalScope3TCo2e: number;
  employeeCount?: number;
  annualRevenueSgd?: number;
  annualEnergyCostSgd: number;
  currentAnnualCarbonTaxSgd: number;
  renewableCoveragePct: number;
}

/**
 * PRD section 14.6 (formerly 17.6) KPI dashboard. Only energy/carbon
 * intensity have a real sourced sector benchmark (sector_benchmarks.json,
 * carbon intensity derived by multiplying by the GEF). The other KPIs are
 * genuinely useful "your value" figures but the PRD's own table left their
 * benchmark columns as empty placeholders — no sourced figure exists, so
 * they're shown without a fabricated comparison band.
 */
export function buildKpis(inputs: KpiInputs): KpiItem[] {
  const kpis: KpiItem[] = [];
  const band = sectorBenchmarks.sectors[inputs.sector as keyof typeof sectorBenchmarks.sectors];

  if (inputs.energyIntensityKwhPerM2 !== null && band) {
    kpis.push({
      id: "energy-intensity",
      label: "Energy intensity",
      value: inputs.energyIntensityKwhPerM2,
      unit: "kWh/m²/year",
      tooltip: "Your annual electricity use per square metre. Lower is better — reduce it by improving HVAC/lighting efficiency (EcoStruxure Building Operation).",
      benchmark: { best: band.bestInClass, average: band.average, poor: band.poor },
    });
    kpis.push({
      id: "carbon-intensity",
      label: "Carbon intensity",
      value: (inputs.energyIntensityKwhPerM2 * GEF) / 1000,
      unit: "tCO2e/m²/year",
      tooltip: "Your energy intensity converted to carbon using Singapore's grid emission factor. Tracks energy intensity directly since it's derived from it.",
      benchmark: {
        best: (band.bestInClass * GEF) / 1000,
        average: (band.average * GEF) / 1000,
        poor: (band.poor * GEF) / 1000,
      },
    });
  }

  if (inputs.employeeCount) {
    kpis.push({
      id: "carbon-per-employee",
      label: "Carbon per employee",
      value: inputs.totalScope12TCo2e / inputs.employeeCount,
      unit: "tCO2e/person/year",
      tooltip: "Your Scope 1+2 footprint divided by headcount. No published sector benchmark exists for this — shown as your value only.",
    });
  }

  if (inputs.annualRevenueSgd) {
    kpis.push({
      id: "energy-cost-ratio",
      label: "Energy cost ratio",
      value: (inputs.annualEnergyCostSgd / inputs.annualRevenueSgd) * 100,
      unit: "% of revenue",
      tooltip: "Your annual energy spend as a share of revenue. No published sector benchmark exists for this — shown as your value only.",
    });
  }

  kpis.push({
    id: "carbon-tax-exposure",
    label: "Carbon tax exposure",
    value: inputs.currentAnnualCarbonTaxSgd,
    unit: "S$/year",
    tooltip:
      inputs.currentAnnualCarbonTaxSgd > 0
        ? "Your estimated direct NEA/IRAS carbon tax bill at today's rate — you're a direct taxpayer (see Regulatory Exposure Check)."
        : "S$0 because you're not a direct carbon taxpayer (Singapore's tax applies only to ~50 large facilities ≥25,000 tCO2e/year direct emissions).",
  });

  const totalEmissions = inputs.totalScope12TCo2e + inputs.totalScope3TCo2e;
  kpis.push({
    id: "scope3-ratio",
    label: "Scope 3 ratio",
    value: totalEmissions > 0 ? (inputs.totalScope3TCo2e / totalEmissions) * 100 : 0,
    unit: "% of total footprint",
    tooltip: "The share of your full carbon footprint sitting in your value chain (Scope 3) rather than your own operations. No published sector benchmark exists for this.",
  });

  kpis.push({
    id: "renewable-coverage",
    label: "Renewable coverage",
    value: inputs.renewableCoveragePct,
    unit: "% of electricity",
    tooltip: "The share of your electricity covered by onsite solar, PPAs, RECs, or a green tariff.",
  });

  return kpis;
}
