"use client";

import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SmeInputs } from "@/lib/types/inputs";
import type { BillExtraction } from "@/lib/ai/types";

interface Props {
  setInputs: Dispatch<SetStateAction<SmeInputs>>;
}

/** PRD 16.3 bill/OCR upload. Vision model transcribes only what's printed on
 * the document — it never estimates. Extracted kWh/S$ are staged for review
 * and only applied to the live form when the user clicks "Apply to form". */
export function BillUploadPanel({ setInputs }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<BillExtraction | null>(null);
  const [applied, setApplied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setExtraction(null);
    setApplied(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/ai/extract-bill", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bill extraction failed.");
        return;
      }
      if (!data.totalKwh && !data.totalAmountSgd) {
        setError("Couldn't read a kWh or S$ figure off that document — try a clearer photo/scan, or enter the values manually.");
        return;
      }
      setExtraction(data);
    } catch {
      setError("Could not reach the AI service. You can enter the figures manually instead.");
    } finally {
      setLoading(false);
    }
  };

  const applyToForm = () => {
    if (!extraction) return;
    setInputs((prev) => ({
      ...prev,
      energy: {
        ...prev.energy,
        ...(extraction.totalKwh ? { monthlyElectricityKwh: extraction.totalKwh } : {}),
        ...(extraction.totalAmountSgd ? { monthlyElectricitySpendSgd: extraction.totalAmountSgd } : {}),
      },
    }));
    setApplied(true);
  };

  return (
    <div className="animate-step rounded-2xl border border-sky-200 bg-sky-50 p-4">
      <button
        className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-left text-sm font-semibold text-sky-800"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0">📄 Upload your electricity bill instead</span>
        <span className="text-xs font-normal whitespace-nowrap">{open ? "Hide" : "Don't know your kWh?"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-sky-700">
            Upload an SP Group / City Gas / Geneco bill (PDF or photo) and we&apos;ll read the kWh and S$ figures off it —
            you&apos;ll get to check them before they&apos;re used.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="text-xs text-sky-800"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {loading && <p className="text-xs text-sky-700">Reading document...</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}

          {extraction && (
            <div className="mt-2 rounded-lg border border-border bg-card p-3">
              <p className="mb-2 text-xs font-medium text-ink-soft">
                Read from uploaded bill — please verify:
              </p>
              <ul className="flex flex-col gap-1 text-xs text-ink-soft">
                {extraction.documentType && (
                  <li>
                    Document type: <span className="font-medium">{extraction.documentType}</span>
                  </li>
                )}
                {(extraction.billingPeriodStart || extraction.billingPeriodEnd) && (
                  <li>
                    Billing period: <span className="font-medium">{extraction.billingPeriodStart ?? "?"} – {extraction.billingPeriodEnd ?? "?"}</span>
                  </li>
                )}
                {extraction.totalKwh && (
                  <li>
                    Total kWh: <span className="font-medium">{extraction.totalKwh.toLocaleString()}</span>
                  </li>
                )}
                {extraction.totalAmountSgd && (
                  <li>
                    Total amount: <span className="font-medium">S${extraction.totalAmountSgd.toLocaleString()}</span>
                  </li>
                )}
                {extraction.impliedTariffSgdPerKwh && (
                  <li>
                    Implied tariff: <span className="font-medium">S${extraction.impliedTariffSgdPerKwh.toFixed(4)}/kWh</span>
                  </li>
                )}
              </ul>
              {extraction.extractionNotes && (
                <p className="mt-2 text-[11px] italic text-ink-soft">{extraction.extractionNotes}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  onClick={applyToForm}
                >
                  Apply to form
                </button>
                <button
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-ink-soft hover:border-brand-400"
                  onClick={() => {
                    setExtraction(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Discard
                </button>
              </div>
              {applied && (
                <p className="mt-2 text-xs text-brand-600">
                  Applied to the Scope 2 — Electricity section below — double-check it against your bill.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
