"use client";

import type { Sector } from "@/lib/types/inputs";
import type { MncInputs } from "@/lib/types/mncInputs";
import { FieldRow, SectionCard, inputClass } from "./FormField";
import { EcmMultiSelect } from "./EcmMultiSelect";
import { EcmAiMatch } from "./EcmAiMatch";
import { Advanced } from "./ui/Advanced";
import { NumberInput } from "./ui/NumberInput";
import { numOrUndef } from "@/lib/formNumber";
import type { MncFormPatchers } from "@/hooks/useMncFormPatchers";

const SECTORS: Sector[] = [
  "Manufacturing",
  "Hospitality",
  "F&B",
  "Retail",
  "Office/Professional Services",
  "Healthcare",
  "Logistics",
  "Data Centre",
  "Other",
];

/** Wizard step 0: portfolio-level company profile and what's already implemented. Split out of MncInputForm.tsx. */
export function MncBusinessInfoSection({
  inputs,
  patchers,
  toggleEcm,
}: {
  inputs: MncInputs;
  patchers: MncFormPatchers;
  toggleEcm: (id: string) => void;
}) {
  const { patch, patchBaseline } = patchers;

  return (
    <SectionCard title="Your business" subtitle="MNC universal inputs">
      <FieldRow label="Company name">
        <input className={inputClass} value={inputs.companyName} onChange={(e) => patch("companyName", e.target.value)} />
      </FieldRow>
      <FieldRow label="Industry sector" required>
        <select className={inputClass} value={inputs.sector} onChange={(e) => patch("sector", e.target.value as Sector)}>
          {SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </FieldRow>
      <FieldRow label="Total employees (all sites)" hint="Powers the carbon-per-employee KPI and the Cat 7 commuting estimate — no effect on $ savings or payback. Optional.">
        <input type="number" className={inputClass} value={inputs.totalEmployees ?? ""} onChange={(e) => patch("totalEmployees", numOrUndef(e.target.value))} />
      </FieldRow>
      <FieldRow label="Listed on SGX?" hint="Adds a compliance flag (mandatory sustainability reporting) only — no effect on $ figures.">
        <select className={inputClass} value={inputs.isListedOnSgx ? "yes" : "no"} onChange={(e) => patch("isListedOnSgx", e.target.value === "yes")}>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </FieldRow>
      <FieldRow label="Estimated solution investment (S$)" required>
        <NumberInput className={inputClass} value={inputs.estimatedInvestmentSgd} onChange={(n) => patch("estimatedInvestmentSgd", n)} />
      </FieldRow>
      <div className="sm:col-span-2 flex flex-col gap-2.5">
        <p className="text-sm font-medium text-ink">Already implemented or in progress</p>
        <p className="-mt-1.5 text-xs text-ink-soft">
          Select or type any measures already in place across your sites, or actively rolling out — just what&apos;s in place, no recommendations
          here. <strong className="font-semibold text-ink">This directly changes your savings rate</strong>: each measure you select here is removed
          from the further-opportunity pool below, so your Top 3 and $ savings figures shift to reflect what&apos;s genuinely still available.
        </p>
        <EcmMultiSelect sector={inputs.sector} selectedIds={inputs.baseline.implementedOrInProgressEcmIds} onToggle={toggleEcm} />
      </div>
      <div className="sm:col-span-2 flex flex-col gap-2">
        <FieldRow label="Anything else already in place? (optional)" hint="Free text — on its own, just context. Use the AI match below to check it against the catalog above.">
          <input
            className={inputClass}
            placeholder="e.g. Siemens Desigo BMS installed 2022"
            value={inputs.baseline.otherMeasuresText ?? ""}
            onChange={(e) => patchBaseline("otherMeasuresText", e.target.value || undefined)}
          />
        </FieldRow>
        <EcmAiMatch
          sector={inputs.sector}
          text={inputs.baseline.otherMeasuresText}
          selectedIds={inputs.baseline.implementedOrInProgressEcmIds}
          onToggle={toggleEcm}
          mode="mnc"
        />
      </div>
      <Advanced title="Advanced / optional">
        <FieldRow label="Annual revenue (S$)" hint="Powers one KPI card only (energy cost as % of revenue) — no effect on $ savings, payback or CO2e.">
          <input type="number" className={inputClass} value={inputs.annualRevenueSgd ?? ""} onChange={(e) => patch("annualRevenueSgd", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="2030 carbon price scenario" hint="Only matters if your direct emissions are large enough to be carbon-tax-liable, or you've reported IRAS exposure below — otherwise it only reshapes the carbon-price trajectory chart, not your $ savings.">
          <select className={inputClass} value={inputs.carbonPriceScenario} onChange={(e) => patch("carbonPriceScenario", e.target.value as MncInputs["carbonPriceScenario"])}>
            <option value="conservative">Conservative — S$50/t</option>
            <option value="base">Base case — S$65/t</option>
            <option value="optimistic">Optimistic — S$80/t</option>
          </select>
        </FieldRow>
      </Advanced>
    </SectionCard>
  );
}
