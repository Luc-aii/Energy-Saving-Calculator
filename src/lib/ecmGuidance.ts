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
