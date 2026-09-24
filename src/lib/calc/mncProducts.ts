import productMapping from "@data/product_mapping.json";
import type { MncInputs } from "@/lib/types/mncInputs";
import type { ProductRecommendation } from "@/lib/types/results";
import { implementedSchneiderProductIds } from "./ecm";

/** MNC-scale product mapping per PRD section 7/8 — MNCs typically warrant the fuller suite. */
export function recommendProductsMnc(inputs: MncInputs): ProductRecommendation[] {
  // Products implied by the company's already-implemented/in-progress ECM selections — a
  // company that's already implemented an EBO-mapped measure correctly stops being
  // recommended EBO as if it had nothing at all.
  const already = implementedSchneiderProductIds(inputs.baseline.implementedOrInProgressEcmIds);
  const recs: ProductRecommendation[] = [];

  const add = (id: string, role: ProductRecommendation["role"]) => {
    const p = productMapping.products.find((x) => x.id === id);
    if (!p) return;
    recs.push({ id: p.id, name: p.name, covers: p.covers, savingRange: p.savingRange, evidence: p.evidence, role });
  };

  if (!already.has("ebo")) add("ebo", "primary");
  // No catalog ECM maps to Resource Advisor specifically — always offered.
  add("resource-advisor", "add-on");

  const hasStationaryOrRenewables = Boolean(
    inputs.fuelFleet.stationaryDieselLitresPerYear || inputs.sites.some((s) => s.renewableCoveragePct > 0)
  );
  if (hasStationaryOrRenewables) add("microgrid-eaas", "add-on");

  // Power quality/distribution is most relevant to variable, heavy-load facilities — not a universal add-on.
  if (
    (inputs.sector === "Manufacturing" || inputs.sector === "Data Centre" || inputs.fuelFleet.isManufacturing) &&
    !already.has("power-powerlogic")
  ) {
    add("power-powerlogic", "add-on");
  }

  // Decarbonisation planning advisory tracks an actual SBTi commitment, not just having picked some reporting framework.
  if (inputs.baseline.sbtiStatus !== "none") {
    add("net-zero-advisory", "add-on");
  }

  add("resource-advisor-scope3", "scope3");

  return recs;
}
