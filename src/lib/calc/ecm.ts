import sectorEnergyEndUse from "@data/sector_energy_enduse.json";
import ecmCatalog from "@data/ecm_catalog.json";
import type { Sector } from "@/lib/types/inputs";
import type {
  EnergyEndUseItem,
  EcmResultSummary,
  SuggestedInvestment,
  EcmRankedItem,
  AlreadyImplementedEcmSummary,
} from "@/lib/types/results";

type SectorEndUseData = typeof sectorEnergyEndUse.sectors;
type SectorKey = keyof SectorEndUseData;

const END_USE_LABELS: Record<string, string> = sectorEnergyEndUse.endUseLabels;

function normalizeToHundred(entries: { id: string; pct: number }[]): { id: string; pct: number }[] {
  const sum = entries.reduce((s, e) => s + Math.max(e.pct, 0), 0);
  if (sum <= 0) return entries.map((e) => ({ ...e, pct: 0 }));
  return entries.map((e) => ({ id: e.id, pct: (Math.max(e.pct, 0) / sum) * 100 }));
}

/**
 * Resolves a sector's energy end-use breakdown, applying the user's sub-profile
 * choice (e.g. Retail "supermarket") and any manual overrides — normalized to
 * sum to exactly 100 so downstream ECM weighting is never skewed by sloppy input.
 */
export function getEndUseBreakdown(
  sector: Sector,
  subProfile: string | undefined,
  customEndUsePct: Record<string, number> | undefined
): EnergyEndUseItem[] {
  const sectorData = (sectorEnergyEndUse.sectors as SectorEndUseData)[sector as SectorKey];
  if (!sectorData) return []; // "Other" and any sector without sourced end-use data — chart hidden upstream.

  const variant = (subProfile && subProfile in sectorData ? subProfile : "default") as keyof typeof sectorData;
  const base = (sectorData[variant] ?? sectorData.default) as { endUses: { id: string; pct: number }[] };

  if (!customEndUsePct || Object.keys(customEndUsePct).length === 0) {
    return base.endUses.map((e) => ({ id: e.id, label: END_USE_LABELS[e.id] ?? e.id, pct: e.pct, userAdjusted: false }));
  }

  const merged = base.endUses.map((e) => ({ id: e.id, pct: customEndUsePct[e.id] ?? e.pct }));
  const normalized = normalizeToHundred(merged);
  return normalized.map((e) => ({ id: e.id, label: END_USE_LABELS[e.id] ?? e.id, pct: e.pct, userAdjusted: true }));
}

/** Sub-profile options for sectors with a bimodal energy end-use split (e.g. Retail "supermarket", Logistics "coldStorage"). */
export function subProfileOptions(sector: Sector): { id: string; label: string }[] {
  const sectorData = (sectorEnergyEndUse.sectors as SectorEndUseData)[sector as SectorKey] as
    | Record<string, { label?: string }>
    | undefined;
  if (!sectorData) return [];
  return Object.entries(sectorData).map(([id, v]) => ({ id, label: v.label ?? (id === "default" ? "Default" : id) }));
}

/**
 * When a sector has exactly one non-default sub-profile (Retail's "supermarket",
 * Logistics's "coldStorage"), returns it as a plain-language yes/no question
 * instead of a generic dropdown — e.g. "Do you operate cold storage...?".
 * Sectors with 0 or 2+ alternates fall back to the dropdown in subProfileOptions.
 */
export function subProfileYesNoQuestion(sector: Sector): { id: string; question: string } | null {
  const sectorData = (sectorEnergyEndUse.sectors as SectorEndUseData)[sector as SectorKey] as
    | Record<string, { question?: string }>
    | undefined;
  if (!sectorData) return null;
  const alternates = Object.entries(sectorData).filter(([id]) => id !== "default");
  if (alternates.length !== 1) return null;
  const [id, v] = alternates[0];
  return v.question ? { id, question: v.question } : null;
}

/** The single largest energy end-use in a breakdown — the sector's "top driver". */
export function getTopEndUse(breakdown: EnergyEndUseItem[]): EnergyEndUseItem | null {
  if (breakdown.length === 0) return null;
  return breakdown.reduce((top, item) => (item.pct > top.pct ? item : top), breakdown[0]);
}

/**
 * ECM catalog measures relevant to a sector, alphabetical — used for the
 * plain "what do you already have" declaration in the business step. No
 * ranking/priority signal here on purpose: that step is pure data
 * collection, not a recommendation (recommendations only ever appear in
 * the results Top-3, via rankRemainingEcms).
 */
export function sectorRelevantEcms(sector: Sector) {
  return ecmCatalog.measures
    .filter((m) => m.sectorTags.includes("all") || m.sectorTags.includes(sector))
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** ECM catalog measures relevant to a sector, ranked by that sector's largest energy end-use first. */
export function rankedEcmsForSector(sector: Sector, subProfile: string | undefined) {
  const breakdown = getEndUseBreakdown(sector, subProfile, undefined);
  const rank = new Map(breakdown.map((b, i) => [b.id, i]));
  return ecmCatalog.measures
    .filter((m) => m.sectorTags.includes("all") || m.sectorTags.includes(sector))
    .slice()
    .sort((a, b) => (rank.get(a.endUseId) ?? 99) - (rank.get(b.endUseId) ?? 99));
}

export const ENERGY_END_USE_LABELS = END_USE_LABELS;

interface ComputeEcmArgs {
  endUseBreakdown: EnergyEndUseItem[];
  selectedEcmIds: string[];
  totalElectricityKwh: number;
  tariffSgdPerKwh: number;
}

/**
 * Combines selected ECM catalog measures into a bottom-up savings-rate estimate.
 * Within an end-use, stacked measures combine multiplicatively (1 - Π(1-saving))
 * so they can never claim more than 100% of that end-use's energy; across
 * end-uses, each end-use's reduction is weighted by its normalized share of
 * total electricity. Low/high bounds are carried through separately (not just
 * a midpoint) so the tool keeps a real, sourced confidence range.
 */
export function computeEcmSavingsRate({
  endUseBreakdown,
  selectedEcmIds,
  totalElectricityKwh,
  tariffSgdPerKwh,
}: ComputeEcmArgs): EcmResultSummary | null {
  if (selectedEcmIds.length === 0 || endUseBreakdown.length === 0) return null;

  const selectedSet = new Set(selectedEcmIds);
  const selectedMeasures = ecmCatalog.measures.filter((m) => selectedSet.has(m.id));
  if (selectedMeasures.length === 0) return null;

  const byEndUse = new Map<string, typeof selectedMeasures>();
  for (const m of selectedMeasures) {
    const list = byEndUse.get(m.endUseId) ?? [];
    list.push(m);
    byEndUse.set(m.endUseId, list);
  }

  let ratePctLow = 0;
  let ratePctMid = 0;
  let ratePctHigh = 0;
  const breakdown: EcmResultSummary["breakdown"] = [];

  for (const endUse of endUseBreakdown) {
    const measures = byEndUse.get(endUse.id);
    if (!measures || measures.length === 0) continue;
    const weight = endUse.pct / 100;

    const combine = (bound: "low" | "high") => 1 - measures.reduce((acc, m) => acc * (1 - m.savingRange[bound]), 1);
    const combinedLow = combine("low");
    const combinedHigh = combine("high");
    const combinedMid = (combinedLow + combinedHigh) / 2;

    ratePctLow += weight * combinedLow;
    ratePctMid += weight * combinedMid;
    ratePctHigh += weight * combinedHigh;

    for (const m of measures) {
      const mMid = (m.savingRange.low + m.savingRange.high) / 2;
      const kwhSavedMid = totalElectricityKwh * weight * mMid;
      const dollarSavedPerYearMid = kwhSavedMid * tariffSgdPerKwh;
      const costTier = COST_TIER_SGD[m.costTier];
      const costMidSgd = (costTier.low + costTier.high) / 2;
      breakdown.push({
        ecmId: m.id,
        label: m.label,
        endUseId: m.endUseId,
        endUseLabel: endUse.label,
        endUseSharePct: endUse.pct,
        endUseKwh: totalElectricityKwh * weight,
        kwhSavedMid,
        contributionToRatePctMid: weight * mMid,
        dollarSavedPerYearMid,
        savingRangeLow: m.savingRange.low,
        savingRangeHigh: m.savingRange.high,
        certainty: (m.certainty ?? "high") as "high" | "variable",
        effortTier: (m.effortTier ?? "medium") as "low" | "medium" | "high",
        evidence: m.evidence,
        howToImplement: m.howToImplement,
        costLowSgd: costTier.low,
        costHighSgd: costTier.high,
        paybackYearsMid: dollarSavedPerYearMid > 0 ? costMidSgd / dollarSavedPerYearMid : null,
        costTier: m.costTier as "low" | "medium" | "high",
      });
    }
  }

  return { ratePctLow, ratePctMid, ratePctHigh, breakdown };
}

/** Rough per-measure order-of-magnitude, not a quote — deliberately wide since a "low cost" retrofit can be a small SME job or a multi-site MNC rollout. */
const COST_TIER_SGD: Record<string, { low: number; high: number }> = {
  low: { low: 5000, high: 20000 },
  medium: { low: 20000, high: 80000 },
  high: { low: 80000, high: 300000 },
};

/**
 * Sums the selected ECMs' cost tiers into a rough investment range — usability
 * finding M3: the typed investment figure was otherwise completely
 * disconnected from what the user actually ticked, so a S$3M estimate against
 * three modest measures (or vice versa) went unflagged. Deliberately
 * labelled "rough" everywhere it's shown; it's an order-of-magnitude sanity
 * check, not a substitute for a quote.
 */
export function estimateInvestmentRange(selectedEcmIds: string[]): SuggestedInvestment | null {
  if (selectedEcmIds.length === 0) return null;
  const selectedSet = new Set(selectedEcmIds);
  const selected = ecmCatalog.measures.filter((m) => selectedSet.has(m.id));
  if (selected.length === 0) return null;
  const lowSgd = selected.reduce((sum, m) => sum + COST_TIER_SGD[m.costTier].low, 0);
  const highSgd = selected.reduce((sum, m) => sum + COST_TIER_SGD[m.costTier].high, 0);
  return { lowSgd, highSgd };
}

/** Schneider product ids implied by the company's already-implemented/in-progress ECM selections — replaces the old vendor-neutral existingSolutionIds checklist for product-recommendation gating (products.ts/mncProducts.ts). */
export function implementedSchneiderProductIds(implementedIds: string[]): Set<string> {
  const implementedSet = new Set(implementedIds);
  const ids = ecmCatalog.measures
    .filter((m) => implementedSet.has(m.id) && "schneiderProductId" in m && m.schneiderProductId)
    .map((m) => (m as { schneiderProductId: string }).schneiderProductId);
  return new Set(ids);
}

/** Every catalog measure relevant to a sector that the company hasn't already told us it has — the "further opportunity" set that now always drives the primary savings rate (see engine.ts/mncEngine.ts). */
export function allRemainingEcmIdsForSector(sector: Sector, implementedIds: string[]): string[] {
  const implementedSet = new Set(implementedIds);
  return ecmCatalog.measures
    .filter((m) => (m.sectorTags.includes("all") || m.sectorTags.includes(sector)) && !implementedSet.has(m.id))
    .map((m) => m.id);
}

/** Sentinel distinguishing "no item processed yet" from a legitimate `null` payback value. */
const UNSET = Symbol("unset");

/**
 * Ranks the not-yet-implemented, sector-relevant ECMs by payback (cost ÷
 * annual $ saved) — one honest number that combines cost and benefit,
 * matching the "ROI-based, least effort most gain" request without inventing
 * an opaque multi-factor weighted score. Each measure is evaluated
 * individually (not combined multiplicatively like computeEcmSavingsRate) so
 * its own payback is a standalone, presentable figure.
 *
 * Dense-ranked rather than sliced at a flat `limit`: two measures can land on
 * exactly the same payback (same cost tier, same saving range, same end-use
 * share — genuinely identical inputs, not floating-point noise), and picking
 * one over the other via array order would be an arbitrary, unexplainable
 * call. Both get rank 3 instead, so the Top 3 can return 4 items when the 3rd
 * place is tied — callers show `rank`, not array position.
 */
export function rankRemainingEcms(
  sector: Sector,
  endUseBreakdown: EnergyEndUseItem[],
  implementedIds: string[],
  totalElectricityKwh: number,
  tariffSgdPerKwh: number,
  limit = 3
): EcmRankedItem[] {
  if (endUseBreakdown.length === 0 || totalElectricityKwh <= 0) return [];
  const implementedSet = new Set(implementedIds);
  const weightByEndUse = new Map(endUseBreakdown.map((e) => [e.id, e.pct / 100]));

  const candidates = ecmCatalog.measures.filter(
    (m) => (m.sectorTags.includes("all") || m.sectorTags.includes(sector)) && !implementedSet.has(m.id)
  );

  const ranked: Omit<EcmRankedItem, "rank">[] = candidates.map((m) => {
    const weight = weightByEndUse.get(m.endUseId) ?? 0;
    const mMid = (m.savingRange.low + m.savingRange.high) / 2;
    const kwhSavedPerMonthMid = (totalElectricityKwh * weight * mMid) / 12;
    const dollarSavedPerMonthMid = kwhSavedPerMonthMid * tariffSgdPerKwh;
    const costTier = COST_TIER_SGD[m.costTier];
    const costMid = (costTier.low + costTier.high) / 2;
    const paybackYearsMid = dollarSavedPerMonthMid > 0 ? costMid / (dollarSavedPerMonthMid * 12) : null;
    return {
      ecmId: m.id,
      label: m.label,
      endUseId: m.endUseId,
      kwhSavedPerMonthMid,
      dollarSavedPerMonthMid,
      costLowSgd: costTier.low,
      costHighSgd: costTier.high,
      paybackYearsMid,
      certainty: (m.certainty ?? "high") as "high" | "variable",
      effortTier: (m.effortTier ?? "medium") as "low" | "medium" | "high",
      evidence: m.evidence,
      howToImplement: m.howToImplement,
      costTier: m.costTier as "low" | "medium" | "high",
    };
  });

  ranked.sort((a, b) => {
    if (a.paybackYearsMid === null && b.paybackYearsMid === null) return 0;
    if (a.paybackYearsMid === null) return 1;
    if (b.paybackYearsMid === null) return -1;
    return a.paybackYearsMid - b.paybackYearsMid;
  });

  const withRank: EcmRankedItem[] = [];
  let rank = 0;
  let lastPayback: number | null | typeof UNSET = UNSET;
  for (const item of ranked) {
    if (lastPayback === UNSET || item.paybackYearsMid !== lastPayback) {
      rank += 1;
      lastPayback = item.paybackYearsMid;
    }
    if (rank > limit) break;
    withRank.push({ ...item, rank });
  }
  return withRank;
}

/**
 * Orders the full "further opportunity" ECM breakdown for display: the Top 3 badged measures
 * are always pinned first, in their official rankRemainingEcms order — never re-derived here.
 * The remainder is then ranked by its own payback (cost ÷ $ saved), so "why is this ranked here"
 * is self-evident from position for everything past #3. Sorting the WHOLE list by this card's own
 * paybackYearsMid (without pinning) let a near-tied unbadged measure land ahead of a badged one,
 * since the two paybacks are computed via separate code paths (monthly vs. annual) whose
 * floating-point ties don't always break the same way — the badge is the single source of truth
 * for the top 3, not a re-sort that can silently disagree with it. (Moved out of ResultsPanel.tsx,
 * which had this ranking rule embedded directly in JSX rather than alongside the rest of the ECM
 * ranking logic.)
 */
export function sortEcmBreakdownForDisplay(
  breakdown: EcmResultSummary["breakdown"],
  topEcmRecommendations: EcmRankedItem[]
): EcmResultSummary["breakdown"] {
  const top3Rank = new Map(topEcmRecommendations.map((t) => [t.ecmId, t.rank]));
  return breakdown.slice().sort((a, b) => {
    const rankA = top3Rank.get(a.ecmId) ?? Infinity;
    const rankB = top3Rank.get(b.ecmId) ?? Infinity;
    if (rankA !== rankB) return rankA - rankB;
    if (a.paybackYearsMid === null && b.paybackYearsMid === null) return 0;
    if (a.paybackYearsMid === null) return 1;
    if (b.paybackYearsMid === null) return -1;
    return a.paybackYearsMid - b.paybackYearsMid;
  });
}

/**
 * Estimated ongoing value of measures already implemented/in progress,
 * computed against the company's current usage — not a claimed historical
 * before/after delta, since no pre-implementation baseline is known. Reuses
 * computeEcmSavingsRate's combination logic so a company that named several
 * measures sharing an end-use gets the same diminishing-returns treatment as
 * the "further opportunity" figure.
 */
export function computeAlreadyImplementedValue(
  endUseBreakdown: EnergyEndUseItem[],
  implementedIds: string[],
  totalElectricityKwh: number,
  tariffSgdPerKwh: number
): AlreadyImplementedEcmSummary | null {
  const result = computeEcmSavingsRate({ endUseBreakdown, selectedEcmIds: implementedIds, totalElectricityKwh, tariffSgdPerKwh });
  if (!result) return null;
  const kwhSavedPerMonthMid = (totalElectricityKwh * result.ratePctMid) / 12;
  return {
    ids: implementedIds,
    ratePctMid: result.ratePctMid,
    kwhSavedPerMonthMid,
    dollarSavedPerMonthMid: kwhSavedPerMonthMid * tariffSgdPerKwh,
  };
}
