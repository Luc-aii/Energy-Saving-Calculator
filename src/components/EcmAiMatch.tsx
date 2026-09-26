"use client";

import { useState } from "react";
import { sectorRelevantEcms } from "@/lib/calc/ecm";
import type { Sector } from "@/lib/types/inputs";

interface Match {
  id: string;
  label: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

/**
 * Solar/REC/EAC/PPA/green-tariff mentions have no catalog entry to match
 * against (see ecm_catalog.json's source note — they offset or price
 * consumption rather than reducing an end-use's energy, so they're modeled
 * via dedicated Scope 2 fields instead). Without this check, typing "solar"
 * here just silently returned "no confident match" with no pointer to where
 * it actually belongs.
 */
const ENERGY_PROCUREMENT_PATTERN =
  /\b(solar|photovoltaic|pv panels?|rooftop panels?|rec|recs|eac|eacs|ppa|green tariff|renewable energy certificate|energy attribute certificate|power purchase agreement)\b/i;

/**
 * The free-text "anything else already in place?" field was context-only —
 * never scored, so a measure described only there (not ticked in the
 * checklist above) still showed up as a "further opportunity" recommendation
 * even though the company already has it. This asks Gemini to match that
 * text against the sector's catalog measures; matches are suggestions the
 * user reviews and adds one at a time, never applied automatically, since a
 * wrong auto-match would silently hide a real opportunity from them.
 */
export function EcmAiMatch({
  sector,
  text,
  selectedIds,
  onToggle,
  mode = "sme",
}: {
  sector: Sector;
  text: string | undefined;
  selectedIds: string[];
  onToggle: (id: string) => void;
  mode?: "sme" | "mnc";
}) {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  const runMatch = async () => {
    const trimmed = text?.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setMatches(null);
    try {
      const candidates = sectorRelevantEcms(sector).map((m) => ({ id: m.id, label: m.label }));
      const res = await fetch("/api/ai/match-ecms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, candidates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "AI matching failed.");
        return;
      }
      const withLabels: Match[] = data.matches.map((m: { id: string; confidence: Match["confidence"]; reasoning: string }) => ({
        ...m,
        label: candidates.find((c) => c.id === m.id)?.label ?? m.id,
      }));
      setMatches(withLabels);
    } catch {
      setError("Could not reach the AI service.");
    } finally {
      setLoading(false);
    }
  };

  const add = (id: string) => {
    onToggle(id);
    setAddedIds((prev) => [...prev, id]);
  };

  const hasText = Boolean(text?.trim());
  const suggestable = matches?.filter((m) => !selectedIds.includes(m.id) && !addedIds.includes(m.id)) ?? null;
  const mentionsEnergyProcurement = Boolean(text && ENERGY_PROCUREMENT_PATTERN.test(text));

  return (
    <div className="flex flex-col gap-2">
      {mentionsEnergyProcurement && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-900">
          Solar, RECs, EACs, PPAs and green tariffs aren&apos;t catalog measures here — they offset or price your electricity rather than
          reducing an end-use&apos;s energy, so the AI match below won&apos;t find anything for this. Enter it in{" "}
          {mode === "mnc" ? (
            <>the <strong>Sites — Scope 2</strong> section&apos;s <strong>Renewable coverage %</strong> field</>
          ) : (
            <>
              the <strong>Scope 2 — Electricity</strong> section&apos;s <strong>Onsite solar generation</strong> toggle (physical solar) and/or{" "}
              <strong>Renewable / green tariff coverage %</strong> field (RECs, PPAs, green tariffs)
            </>
          )}
          {" "}instead — it directly reduces your calculated cost and emissions there.
        </p>
      )}
      <button
        type="button"
        onClick={runMatch}
        disabled={!hasText || loading}
        className="self-start rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-brand-600 transition hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Matching..." : "✨ Match this against our measure catalog"}
      </button>
      {!hasText && <p className="text-[11px] text-ink-soft">Type something above first.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {matches && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5">
          {suggestable && suggestable.length === 0 && (
            <p className="text-xs text-ink-soft">No confident catalog match found — nothing added. You can still tick measures manually above.</p>
          )}
          {suggestable?.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-medium text-ink">
                  {m.label} <span className="text-[10px] font-normal text-ink-soft">({m.confidence} confidence)</span>
                </p>
                <p className="text-ink-soft">{m.reasoning}</p>
              </div>
              <button
                type="button"
                onClick={() => add(m.id)}
                className="shrink-0 rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-600"
              >
                Add
              </button>
            </div>
          ))}
          {addedIds.length > 0 && (
            <p className="text-[11px] text-brand-600">Added {addedIds.length} measure(s) to your already-implemented list above.</p>
          )}
        </div>
      )}
      <p className="text-[10px] italic text-ink-soft">
        Suggestions only — nothing is added until you click &quot;Add&quot;. A wrong tick here would hide a real saving opportunity, so double-check
        the reasoning before accepting.
      </p>
    </div>
  );
}
