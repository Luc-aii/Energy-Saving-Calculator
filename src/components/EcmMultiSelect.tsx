"use client";

import { useState } from "react";
import { sectorRelevantEcms, ENERGY_END_USE_LABELS } from "@/lib/calc/ecm";
import type { Sector } from "@/lib/types/inputs";
import { inputClass, checkboxInputClass } from "./FormField";

/**
 * Single mechanism for "which measures do you already have or are actively
 * rolling out?" — replaces the old three parallel checklists (generic
 * existing-solutions categories, SME-only efficiency-initiatives, and the
 * separate "planned ECM" picker). Selections here both (a) exclude those
 * measures from the Top-3 further-opportunity recommendation and (b) drive
 * the "already saving" credit shown in the results hero.
 *
 * Deliberately no ranking/priority badge here — this is pure declaration of
 * what's in place, not a recommendation (recommendations only ever appear
 * in the results Top-3).
 */
export function EcmMultiSelect({
  sector,
  selectedIds,
  onToggle,
}: {
  sector: Sector;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const measures = sectorRelevantEcms(sector).filter((m) => q === "" || m.label.toLowerCase().includes(q));

  return (
    <div className="flex flex-col gap-2.5">
      <input
        type="text"
        placeholder="Search or type to filter measures…"
        className={inputClass}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
        {measures.map((m) => {
          const certainty = "certainty" in m ? (m.certainty as "high" | "variable" | undefined) : undefined;
          return (
            <label key={m.id} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5 text-xs">
              <input
                type="checkbox"
                className={`${checkboxInputClass} mt-0.5`}
                checked={selectedIds.includes(m.id)}
                onChange={() => onToggle(m.id)}
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-ink">{m.label}</span>
                <span className="text-ink-soft">
                  {(m.savingRange.low * 100).toFixed(0)}–{(m.savingRange.high * 100).toFixed(0)}% of {ENERGY_END_USE_LABELS[m.endUseId] ?? m.endUseId} energy ·{" "}
                  {m.costTier} cost{certainty === "variable" ? " · savings vary by site, not guaranteed" : ""}
                </span>
              </span>
            </label>
          );
        })}
        {measures.length === 0 && <p className="text-xs text-ink-soft">No measures match &quot;{query}&quot;.</p>}
      </div>
      {selectedIds.length === 0 && (
        <p className="text-xs text-ink-soft">Nothing selected — that&apos;s fine, we&apos;ll work from a clean slate.</p>
      )}
    </div>
  );
}
