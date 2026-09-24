import productMapping from "@data/product_mapping.json";
import type { SmeInputs } from "@/lib/types/inputs";
import type { ProductRecommendation } from "@/lib/types/results";
import { implementedSchneiderProductIds } from "./ecm";

/**
 * Product-to-saving mapping per PRD section 7. Every output must name a
 * specific product — never a generic "efficiency upgrade".
 */
export function recommendProducts(inputs: SmeInputs): ProductRecommendation[] {
  // Products implied by the company's already-implemented/in-progress ECM selections — a
  // company that's already implemented an EBO-mapped measure correctly stops being
  // recommended EBO as if it had nothing at all.
  const already = implementedSchneiderProductIds(inputs.baseline.implementedOrInProgressEcmIds);
  const recs: ProductRecommendation[] = [];

  const ebo = productMapping.products.find((p) => p.id === "ebo")!;
  if (!already.has("ebo")) {
    recs.push({
      id: ebo.id,
      name: ebo.name,
      covers: ebo.covers,
      savingRange: ebo.savingRange,
      evidence: ebo.evidence,
      role: "primary",
    });
  }

  // No catalog ECM maps to Resource Advisor specifically — always offered; over-suggesting a
  // reporting product is a much smaller cost than tracking a separate "do you already report"
  // checklist alongside the ECM selections.
  const resourceAdvisor = productMapping.products.find((p) => p.id === "resource-advisor")!;
  recs.push({
    id: resourceAdvisor.id,
    name: resourceAdvisor.name,
    covers: resourceAdvisor.covers,
    savingRange: resourceAdvisor.savingRange,
    evidence: resourceAdvisor.evidence,
    role: "add-on",
  });

  if (inputs.fuelFleet.hasGenerator || inputs.energy.hasSolar) {
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

  // Smart metering/power-quality monitoring is the starting point for a customer with no
  // monitoring/BMS of any kind yet (PRD Profile A).
  if (!already.has("ebo") && !already.has("power-powerlogic")) {
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
