"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Sector, SmeInputs } from "@/lib/types/inputs";
import { FieldRow, SectionCard, inputClass } from "./FormField";
import { AiGuidedInput } from "./AiGuidedInput";
import { EcmMultiSelect } from "./EcmMultiSelect";
import { EcmAiMatch } from "./EcmAiMatch";
import { Advanced } from "./ui/Advanced";
import { NumberInput } from "./ui/NumberInput";
import { numOrUndef } from "@/lib/formNumber";
import type { SmeFormPatchers } from "@/hooks/useSmeFormPatchers";

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

/** Wizard step 0: company profile, sector, and what's already implemented. Split out of InputForm.tsx. */
export function BusinessInfoSection({
  inputs,
  setInputs,
  patchers,
  toggleEcm,
}: {
  inputs: SmeInputs;
  setInputs: Dispatch<SetStateAction<SmeInputs>>;
  patchers: SmeFormPatchers;
  toggleEcm: (id: string) => void;
}) {
  const { patch, patchUniversal, patchBaseline } = patchers;

  return (
    <>
      <AiGuidedInput setInputs={setInputs} />
      <SectionCard title="Your business" subtitle="Sets your benchmark and scenario">
        <FieldRow label="Company name">
          <input
            className={inputClass}
            value={inputs.universal.companyName}
            onChange={(e) => patchUniversal("companyName", e.target.value)}
          />
        </FieldRow>
        <FieldRow label="Industry sector" required>
          <select
            className={inputClass}
            value={inputs.universal.sector}
            onChange={(e) => patchUniversal("sector", e.target.value as Sector)}
          >
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Number of sites" hint="Descriptive only — doesn't change your $ savings, payback or CO2e figures">
          <NumberInput
            min={1}
            className={inputClass}
            value={inputs.universal.numberOfSites}
            onChange={(n) => patchUniversal("numberOfSites", Math.max(n, 1))}
          />
        </FieldRow>
        <FieldRow label="Floor area (m²)" hint="Feeds the energy-intensity benchmark below. If you leave both kWh and S$ spend blank further down, it also becomes the basis for estimating your electricity use itself — and therefore your $ savings, payback and CO2e — so it's worth entering accurately even though it's optional.">
          <input
            type="number"
            className={inputClass}
            value={inputs.universal.floorAreaM2 ?? ""}
            onChange={(e) => patchUniversal("floorAreaM2", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Number of employees" hint="Optional — powers the carbon-per-employee KPI and defaults the commuting count in Advanced if left blank">
          <input
            type="number"
            className={inputClass}
            value={inputs.universal.employeeCount ?? ""}
            onChange={(e) => patchUniversal("employeeCount", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Estimated solution investment (S$)" hint="Adjustable — default guess, refine with a Schneider advisor" required>
          <NumberInput className={inputClass} value={inputs.estimatedInvestmentSgd} onChange={(n) => patch("estimatedInvestmentSgd", n)} />
        </FieldRow>
        <div className="sm:col-span-2 flex flex-col gap-2.5">
          <p className="text-sm font-medium text-ink">Already implemented or in progress</p>
          <p className="-mt-1.5 text-xs text-ink-soft">
            Select or type any measures you already have, or are actively rolling out — just what&apos;s in place, no recommendations here.
            <strong className="font-semibold text-ink"> This directly changes your savings rate</strong>: each measure ticked here is removed
            from the further-opportunity pool below, so your Top 3 and $ savings figures shift to reflect what&apos;s genuinely still available.
          </p>
          <EcmMultiSelect sector={inputs.universal.sector} selectedIds={inputs.baseline.implementedOrInProgressEcmIds} onToggle={toggleEcm} />
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
            sector={inputs.universal.sector}
            text={inputs.baseline.otherMeasuresText}
            selectedIds={inputs.baseline.implementedOrInProgressEcmIds}
            onToggle={toggleEcm}
            mode="sme"
          />
        </div>
        <Advanced title="Advanced / optional">
          <FieldRow label="Annual revenue (S$)" hint="Powers one KPI card only (energy cost as % of revenue) — no effect on $ savings, payback or CO2e.">
            <input
              type="number"
              className={inputClass}
              value={inputs.universal.annualRevenueSgd ?? ""}
              onChange={(e) => patchUniversal("annualRevenueSgd", numOrUndef(e.target.value))}
            />
          </FieldRow>
          <FieldRow label="2030 carbon price scenario" hint="Only matters if your direct emissions are large enough to be carbon-tax-liable (rare for most SMEs) — otherwise it only reshapes the carbon-price trajectory chart, not your $ savings.">
            <select
              className={inputClass}
              value={inputs.carbonPriceScenario}
              onChange={(e) => patch("carbonPriceScenario", e.target.value as SmeInputs["carbonPriceScenario"])}
            >
              <option value="conservative">Conservative — S$50/t</option>
              <option value="base">Base case — S$65/t</option>
              <option value="optimistic">Optimistic — S$80/t</option>
            </select>
          </FieldRow>
        </Advanced>
      </SectionCard>
    </>
  );
}
