"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Sector, SmeInputs } from "@/lib/types/inputs";
import type { ProfileExtraction } from "@/lib/ai/types";
import { inputClass } from "./FormField";

interface Props {
  setInputs: Dispatch<SetStateAction<SmeInputs>>;
}

/** PRD 16.2 chat-to-form flow. AI only pre-fills descriptive fields below —
 * it never touches emission factors or $ figures, and nothing is written to
 * the live form until the user reviews and clicks "Apply to form". */
export function AiGuidedInput({ setInputs }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ProfileExtraction | null>(null);
  const [applied, setApplied] = useState(false);

  const runExtraction = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setExtraction(null);
    setApplied(false);
    try {
      const res = await fetch("/api/ai/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "AI extraction failed.");
        return;
      }
      if (Object.keys(data).filter((k) => k !== "notes").length === 0) {
        setError("Couldn't find any usable details in that description — try mentioning your sector, employee count, or site size.");
        return;
      }
      setExtraction(data);
    } catch {
      setError("Could not reach the AI service. You can fill the form manually instead.");
    } finally {
      setLoading(false);
    }
  };

  const applyToForm = () => {
    if (!extraction) return;
    setInputs((prev) => ({
      ...prev,
      universal: {
        ...prev.universal,
        ...(extraction.companyName ? { companyName: extraction.companyName.value } : {}),
        ...(extraction.sector ? { sector: extraction.sector.value as Sector } : {}),
        ...(extraction.employeeCount ? { employeeCount: extraction.employeeCount.value } : {}),
        ...(extraction.floorAreaM2 ? { floorAreaM2: extraction.floorAreaM2.value } : {}),
        ...(extraction.numberOfSites ? { numberOfSites: extraction.numberOfSites.value } : {}),
      },
      energy: {
        ...prev.energy,
        ...(extraction.hasSolar ? { hasSolar: extraction.hasSolar.value } : {}),
        ...(extraction.monthlyElectricityKwh ? { monthlyElectricityKwh: extraction.monthlyElectricityKwh.value } : {}),
      },
      fuelFleet: {
        ...prev.fuelFleet,
        ...(extraction.hasVehicles ? { hasVehicles: extraction.hasVehicles.value } : {}),
      },
      refrigerants: {
        ...prev.refrigerants,
        ...(extraction.hasRefrigerants ? { hasRefrigerants: extraction.hasRefrigerants.value } : {}),
      },
    }));
    setApplied(true);
  };

  const fieldRows = extraction
    ? ([
        ["Company name", extraction.companyName],
        ["Sector", extraction.sector],
        ["Employees", extraction.employeeCount],
        ["Floor area (m²)", extraction.floorAreaM2],
        ["Number of sites", extraction.numberOfSites],
        ["Has vehicles", extraction.hasVehicles],
        ["Has solar", extraction.hasSolar],
        ["Has refrigerants", extraction.hasRefrigerants],
        ["Monthly electricity (kWh)", extraction.monthlyElectricityKwh],
      ] as const)
    : [];

  return (
    <div className="animate-step rounded-2xl border border-brand-100 bg-brand-50 p-4">
      <button
        className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-left text-sm font-semibold text-brand-700"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0">✨ Let AI help me fill this in</span>
        <span className="text-xs font-normal whitespace-nowrap">{open ? "Hide" : "Tell us about your business"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-brand-600">
            Describe your business in a sentence or two (e.g. &quot;a 200-person office in Jurong with rooftop solar&quot;).
            AI only pre-fills the fields below for you to check — it never generates emission factors or dollar figures.
          </p>
          <textarea
            className={`${inputClass} min-h-20`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell me about your business..."
          />
          <div>
            <button
              className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              onClick={runExtraction}
              disabled={loading || !text.trim()}
            >
              {loading ? "Reading..." : "Extract fields"}
            </button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {extraction && (
            <div className="mt-2 rounded-lg border border-border bg-card p-3">
              <p className="mb-2 text-xs font-medium text-ink-soft">
                Review before applying — nothing changes in your form yet:
              </p>
              <ul className="flex flex-col gap-1.5">
                {fieldRows
                  .filter(([, f]) => f !== undefined)
                  .map(([label, f]) => (
                    <li key={label} className="flex items-center justify-between text-xs">
                      <span className="text-ink-soft">{label}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium text-ink">{String(f!.value)}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            f!.source === "stated"
                              ? "bg-brand-100 text-brand-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {f!.source === "stated" ? "From your input" : "AI estimated"}
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
              {extraction.notes && <p className="mt-2 text-[11px] italic text-ink-soft">{extraction.notes}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  onClick={applyToForm}
                >
                  Apply to form
                </button>
                <button
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-ink-soft hover:border-brand-400"
                  onClick={() => setExtraction(null)}
                >
                  Discard
                </button>
              </div>
              {applied && <p className="mt-2 text-xs text-brand-600">Applied — check the fields below and adjust anything that&apos;s not quite right.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
