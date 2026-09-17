import type { SmeInputs } from "@/lib/types/inputs";
import type { CalculationResult } from "@/lib/types/results";
import { formatSgd, formatTonnes } from "@/lib/format";

/**
 * Template-based narrative per PRD section 15.4. This is deterministic string
 * interpolation, NOT a live LLM call — no AI backend is wired into this app.
 * It reproduces the target structure so the output shape can be validated;
 * swap in a real model call behind this function when one is available.
 */
export function buildNarrative(inputs: SmeInputs, result: CalculationResult): string {
  const y1 = result.yearRows[0];
  const y10 = result.yearRows[result.yearRows.length - 1];
  const primaryProduct = result.products.find((p) => p.role === "primary");
  const addOn = result.products.find((p) => p.role === "add-on");

  const products = [primaryProduct?.name, addOn?.name].filter(Boolean).join(" and ");
  const sizeDescriptor = inputs.universal.floorAreaM2
    ? `${inputs.universal.floorAreaM2}m²`
    : inputs.universal.employeeCount
    ? `${inputs.universal.employeeCount} employees`
    : "your site";

  const isLiable = result.compliance.some((c) => c.id === "carbon-tax-liable");

  return [
    `${inputs.universal.companyName} — a ${inputs.universal.sector} business with ${sizeDescriptor} in Singapore — emits approximately ${formatTonnes(result.totalScope12TCo2e)}/year across Scope 1 and 2.`,
    products && isLiable
      ? `By deploying ${products}, you could save an estimated ${formatSgd(y1.energySavingSgd + y1.carbonTaxSavingSgd)} per year, rising to ${formatSgd(y10.energySavingSgd + y10.carbonTaxSavingSgd)} per year by year 10 as Singapore's carbon price rises to S$${y10.carbonTaxRateUsed.toFixed(0)}/tonne and your direct carbon tax bill shrinks accordingly.`
      : products
      ? `By deploying ${products}, you could save an estimated ${formatSgd(y1.energySavingSgd)} per year on energy costs. Singapore's carbon tax doesn't apply directly to your facility (that's reserved for large industrial emitters) — its cost is already embedded in the electricity tariff you pay today, so no separate carbon tax line is added here. If you expect tariffs to keep rising as the carbon price climbs toward 2030, model that explicitly with the tariff escalation slider.`
      : "",
    result.paybackYears
      ? `With your EEG grant applied, your payback period is approximately ${result.paybackYears.toFixed(1)} years.`
      : "This investment is not projected to pay back within the 10-year horizon at current assumptions — consider a smaller-scope solution.",
    `Over 10 years, the cumulative financial benefit is estimated at ${formatSgd(result.confidence.tenYearRange.low)} to ${formatSgd(result.confidence.tenYearRange.high)}.`,
    result.baselineScope3TCo2e > 0
      ? `Your Scope 3 footprint of ~${formatTonnes(result.baselineScope3TCo2e)}/year is identified but not included in the financial saving — EcoStruxure Resource Advisor can help you track and report this for SBTi and SGX sustainability reporting purposes.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}
