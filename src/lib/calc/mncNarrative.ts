import type { MncInputs } from "@/lib/types/mncInputs";
import type { CalculationResult } from "@/lib/types/results";
import { formatSgd, formatTonnes } from "@/lib/format";

/** Template-based narrative for MNC mode — same non-AI disclosure as the SME narrative. */
export function buildMncNarrative(inputs: MncInputs, result: CalculationResult): string {
  const y1 = result.yearRows[0];
  const y10 = result.yearRows[result.yearRows.length - 1];
  const primaryProduct = result.products.find((p) => p.role === "primary");
  const addOns = result.products.filter((p) => p.role === "add-on").map((p) => p.name);

  const isLiable = result.compliance.some((c) => c.id === "carbon-tax-liable");

  return [
    `${inputs.companyName} — a ${inputs.sector} business across ${inputs.sites.length} Singapore site(s)${inputs.totalEmployees ? ` with ${inputs.totalEmployees} employees` : ""} — emits approximately ${formatTonnes(result.totalScope12TCo2e)}/year across Scope 1 and 2.`,
    primaryProduct && isLiable
      ? `By deploying ${primaryProduct.name}${addOns.length ? ` alongside ${addOns.join(" and ")}` : ""}, you could save an estimated ${formatSgd(y1.energySavingSgd + y1.carbonTaxSavingSgd)} per year, rising to ${formatSgd(y10.energySavingSgd + y10.carbonTaxSavingSgd)} per year by year 10 as Singapore's carbon price rises to S$${y10.carbonTaxRateUsed.toFixed(0)}/tonne and your direct carbon tax bill shrinks accordingly.`
      : primaryProduct
      ? `By deploying ${primaryProduct.name}${addOns.length ? ` alongside ${addOns.join(" and ")}` : ""}, you could save an estimated ${formatSgd(y1.energySavingSgd)} per year on energy costs. Your direct (Scope 1) emissions are below the 25,000 tCO2e/year carbon tax threshold, so no separate carbon tax saving is shown — that cost is already embedded in the electricity tariff used above.`
      : "",
    result.paybackYears
      ? `At your stated investment level, payback is approximately ${result.paybackYears.toFixed(1)} years.`
      : "This investment is not projected to pay back within the 10-year horizon at current assumptions.",
    inputs.baseline.engagementModel !== "Not sure"
      ? `This fits your preferred "${inputs.baseline.engagementModel}" engagement model within your stated ${inputs.baseline.budgetRange} budget range.`
      : "",
    `Over 10 years, the cumulative financial benefit is estimated at ${formatSgd(result.confidence.tenYearRange.low)} to ${formatSgd(result.confidence.tenYearRange.high)}.`,
    result.baselineScope3TCo2e > 0
      ? `Your Scope 3 footprint across the 6 priority categories is estimated at ~${formatTonnes(result.baselineScope3TCo2e)}/year — identified but not included in the financial saving. EcoStruxure Resource Advisor can help track and report this for ${inputs.baseline.reportingFramework !== "None" ? inputs.baseline.reportingFramework : "SBTi"} purposes.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}
