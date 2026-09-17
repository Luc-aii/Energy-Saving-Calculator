import productMapping from "@data/product_mapping.json";
import type { SmeInputs } from "@/lib/types/inputs";
import type { ProductRecommendation } from "@/lib/types/results";

/**
 * Product-to-saving mapping per PRD section 7. Every output must name a
 * specific product — never a generic "efficiency upgrade".
 */
export function recommendProducts(inputs: SmeInputs): ProductRecommendation[] {
  // Category ids from existingMeasures.ts (vendor-neutral) — a company with a competitor's
  // BMS checks "bms" and correctly stops being recommended EBO as if it had nothing at all.
  const already = new Set(inputs.baseline.existingSolutionIds);
  const recs: ProductRecommendation[] = [];

  const ebo = productMapping.products.find((p) => p.id === "ebo")!;
  if (!already.has("bms")) {
    recs.push({
      id: ebo.id,
      name: ebo.name,
      covers: ebo.covers,
      savingRange: ebo.savingRange,
      evidence: ebo.evidence,
      role: "primary",
    });
  }

  const resourceAdvisor = productMapping.products.find((p) => p.id === "resource-advisor")!;
  if (!already.has("energy-monitoring") && !already.has("carbon-reporting-software")) {
    recs.push({
      id: resourceAdvisor.id,
      name: resourceAdvisor.name,
      covers: resourceAdvisor.covers,
      savingRange: resourceAdvisor.savingRange,
      evidence: resourceAdvisor.evidence,
      role: "add-on",
    });
  }

  if ((inputs.fuelFleet.hasGenerator || inputs.energy.hasSolar) && !already.has("onsite-renewable-microgrid")) {
    const microgrid = productMapping.products.find((p) => p.id === "microgrid-eaas")!;
    recs.push({
      id: microgrid.id,
      name: microgrid.name,
      covers: microgrid.covers,
      savingRange: microgrid.savingRange,
      evidence: microgrid.evidence,
      role: "add-on",
    });
  }

  // Smart metering is the starting point for a customer with no monitoring/BMS of any kind yet (PRD Profile A).
  if (!already.has("bms") && !already.has("energy-monitoring") && !already.has("power-quality")) {
    const powerLogic = productMapping.products.find((p) => p.id === "power-powerlogic")!;
    recs.push({
      id: powerLogic.id,
      name: powerLogic.name,
      covers: powerLogic.covers,
      savingRange: powerLogic.savingRange,
      evidence: powerLogic.evidence,
      role: "add-on",
    });
  }

  const scope3Product = productMapping.products.find((p) => p.id === "resource-advisor-scope3")!;
  recs.push({
    id: scope3Product.id,
    name: scope3Product.name,
    covers: scope3Product.covers,
    savingRange: null,
    evidence: scope3Product.evidence,
    role: "scope3",
  });

  return recs;
}
