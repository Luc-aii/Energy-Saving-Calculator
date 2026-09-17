import productMapping from "@data/product_mapping.json";
import type { MncInputs } from "@/lib/types/mncInputs";
import type { ProductRecommendation } from "@/lib/types/results";

/** MNC-scale product mapping per PRD section 7/8 — MNCs typically warrant the fuller suite. */
export function recommendProductsMnc(inputs: MncInputs): ProductRecommendation[] {
  // Category ids from existingMeasures.ts (vendor-neutral) — a company with a competitor's
  // BMS checks "bms" and correctly stops being recommended EBO as if it had nothing at all.
  const already = new Set(inputs.baseline.existingSolutionIds);
  const recs: ProductRecommendation[] = [];

  const add = (id: string, role: ProductRecommendation["role"]) => {
    const p = productMapping.products.find((x) => x.id === id);
    if (!p) return;
    recs.push({ id: p.id, name: p.name, covers: p.covers, savingRange: p.savingRange, evidence: p.evidence, role });
  };

  if (!already.has("bms")) add("ebo", "primary");
  if (!already.has("energy-monitoring") && !already.has("carbon-reporting-software")) add("resource-advisor", "add-on");

  const hasStationaryOrRenewables = Boolean(
    inputs.fuelFleet.stationaryDieselLitresPerYear || inputs.sites.some((s) => s.renewableCoveragePct > 0)
  );
  if (hasStationaryOrRenewables && !already.has("onsite-renewable-microgrid")) add("microgrid-eaas", "add-on");

  // Power quality/distribution is most relevant to variable, heavy-load facilities — not a universal add-on.
  if (
    (inputs.sector === "Manufacturing" || inputs.sector === "Data Centre" || inputs.fuelFleet.isManufacturing) &&
    !already.has("power-quality")
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
