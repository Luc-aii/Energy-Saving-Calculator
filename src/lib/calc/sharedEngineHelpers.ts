import type { EcmResultSummary } from "@/lib/types/results";

/**
 * Pulled out of engine.ts and mncEngine.ts, which had each grown their own copy of these — safe,
 * behavior-preserving extractions only (verified identical in both files before moving). The larger
 * per-mode calculation flows (Scope 1/2/3 build-up, confidence scoring, investment-horizon checks)
 * are NOT merged here: SME is single-site with an investment-horizon field MNC doesn't have, MNC is
 * multi-site with its own aggregation and confidence scoring — genuinely different shapes, not just
 * copy-pasted sameness, so forcing them into one function would risk introducing a real behavior
 * change rather than removing an accidental one.
 */

/**
 * A bare `if (x)` truthiness check treats a negative number the same as a positive one (only 0/undefined
 * are falsy), so a mistyped "-5000" kWh would silently flow into the maths as -5000. Clamps every raw
 * physical quantity to >=0 before use (usability finding H2).
 */
export function nonNeg(v: number | undefined): number {
  return Math.max(v ?? 0, 0);
}

/**
 * The sector-position label (e.g. "worst quartile") describes where the calibration curve places this
 * business/portfolio — but when an ECM-derived or manual rate is actually used, showing that label next
 * to a different % read as contradictory (usability finding M1). Every branch states the actual assumed
 * rate once, in context, so the caller never needs to append its own separate "assumed rate X%" suffix
 * (that used to duplicate the number a second time in the ECM/override branches).
 */
export function buildFinalPositionLabel(
  positionLabel: string,
  computedRatePct: number,
  ecmResult: EcmResultSummary | null,
  savingsRateOverridePct: number | undefined
): string {
  if (ecmResult) {
    return savingsRateOverridePct
      ? `${positionLabel} — sector curve suggests ${(computedRatePct * 100).toFixed(0)}%; your manual override sets ${(savingsRateOverridePct * 100).toFixed(0)}%`
      : `${positionLabel} — sector curve suggests ${(computedRatePct * 100).toFixed(0)}%; your ${ecmResult.breakdown.length} remaining Energy Conservation Measure(s) give ${(ecmResult.ratePctMid * 100).toFixed(0)}%`;
  }
  if (savingsRateOverridePct) {
    return `${positionLabel} — sector curve suggests ${(computedRatePct * 100).toFixed(0)}%; your manual override sets ${(savingsRateOverridePct * 100).toFixed(0)}%`;
  }
  return `${positionLabel} — assumed energy saving rate ${(computedRatePct * 100).toFixed(0)}%`;
}

/** Sanity-check warnings on the final assumed savings rate — identical thresholds/copy in both modes. */
export function savingsRateSanityWarnings(finalSavingRatePct: number): string[] {
  const warnings: string[] = [];
  if (finalSavingRatePct > 0.4) warnings.push("Estimated savings exceed 40% — unusually high, please verify inputs.");
  if (finalSavingRatePct < 0.05) warnings.push("Estimated savings are below 5% — below the typical minimum threshold for most Schneider solutions.");
  return warnings;
}

/** Shared across both modes; SME additionally checks against its investment-horizon field (MNC has no equivalent input), so that part stays in engine.ts. */
export function fastPaybackWarning(paybackYears: number | null): string | null {
  if (paybackYears !== null && paybackYears < 2) {
    return "Payback period under 2 years is unusually fast — please double-check your investment cost estimate.";
  }
  return null;
}
