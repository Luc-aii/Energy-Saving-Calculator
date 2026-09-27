import ecmCatalog from "@data/ecm_catalog.json";
import productMapping from "@data/product_mapping.json";
import type { Sector } from "@/lib/types/inputs";

/**
 * "Who typically does this" and "when to do it" — derived from the three
 * categorical fields every catalog measure already carries (effortTier,
 * costTier, certainty), not invented per-measure. Kept generic on purpose:
 * this is a rough staffing/timing pointer for a first pass, not a substitute
 * for a Schneider site visit that would actually scope who and when for a
 * specific building.
 */

export function whoImplementsEcm(effortTier: "low" | "medium" | "high"): string {
  if (effortTier === "low") return "Usually handled in-house by your facilities/maintenance team — no specialist contractor typically needed.";
  if (effortTier === "medium") return "Typically needs a specialist contractor or your BMS/controls vendor to install and commission.";
  return "A capital project — involves procurement, your equipment vendor, and a specialist contractor for installation.";
}

export function whenToDoEcm(costTier: "low" | "medium" | "high", certainty: "high" | "variable"): string {
  let base: string;
  if (costTier === "low") {
    base = "No need to wait for a capital cycle — can usually be scheduled anytime, e.g. your next maintenance window.";
  } else if (costTier === "medium") {
    base = "Worth budgeting into your next maintenance or minor-works cycle rather than treating it as an emergency fix.";
  } else {
    base = "Best planned around your next capex/budget cycle or when the existing equipment is due for replacement, so the cost is absorbed into a planned upgrade rather than a standalone spend.";
  }
  if (certainty === "variable") {
    base += " Needs periodic recommissioning/tuning to keep delivering the saving — budget an ongoing check, not just a one-off install.";
  }
  return base;
}

/**
 * The specific Schneider product that delivers a given ECM, where the catalog maps one — roughly
 * a third of measures are pure hardware/equipment swaps (chillers, refrigerant gas, compressor
 * replacement) with no bundled Schneider digital product, which is worth showing honestly rather
 * than forcing every measure onto a product it doesn't actually need.
 */
export function productForEcm(ecmId: string): { name: string; covers: string } | null {
  const measure = ecmCatalog.measures.find((m) => m.id === ecmId);
  if (!measure || !("schneiderProductId" in measure) || !measure.schneiderProductId) return null;
  const product = productMapping.products.find((p) => p.id === (measure as { schneiderProductId: string }).schneiderProductId);
  if (!product) return null;
  return { name: product.name, covers: product.covers };
}

/**
 * One real, sourced Schneider case study per sector (see data/product_mapping.json evidence
 * lines, re-verified against se.com) — the results page's "benchmark position" social-proof
 * callout. Falls back to Schneider's own Singapore HQ deployment (Kallang Pulse) for sectors
 * without a directly matching named case study, rather than inventing one.
 */
const SECTOR_CASE_STUDIES: Partial<Record<Sector, { name: string; detail: string }>> = {
  "Office/Professional Services": {
    name: "JLL Asia-Pacific HQ, Singapore",
    detail: "Deployed EcoStruxure Building Operation (EBO) across its Singapore office HQ and cut energy use by 30%.",
  },
  Manufacturing: {
    name: "Samwoh Smart Hub, Singapore",
    detail: "An EBO-driven industrial facility saving ~S$220k/year (≈4-year payback) and running 84% below its 2005 baseline — Singapore's first BCA Green Mark Platinum Positive Energy industrial building (2024).",
  },
  Hospitality: {
    name: "Marriott, Greater China hotels",
    detail: "Centralised EcoStruxure Resource Advisor reporting paired with EBO controls delivered 10-15% energy savings across the hotel portfolio.",
  },
};

const FALLBACK_CASE_STUDY = {
  name: "Kallang Pulse, Schneider Electric's own Singapore HQ",
  detail: "A microgrid + Energy-as-a-Service deployment achieved a 3.3-year payback and S$51,698/year saved, earning the BCA Green Mark Platinum Zero Energy Award (2023).",
};

export function caseStudyForSector(sector: Sector | string): { name: string; detail: string } {
  return SECTOR_CASE_STUDIES[sector as Sector] ?? FALLBACK_CASE_STUDY;
}
