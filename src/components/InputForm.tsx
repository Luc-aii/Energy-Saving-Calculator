"use client";

import type { Dispatch, SetStateAction } from "react";
import type { SmeInputs } from "@/lib/types/inputs";
import { useSmeFormPatchers } from "@/hooks/useSmeFormPatchers";
import { BusinessInfoSection } from "./BusinessInfoSection";
import { Scope2ElectricitySection } from "./Scope2ElectricitySection";
import { Scope1FuelSection } from "./Scope1FuelSection";
import { AdvancedSettingsSection } from "./AdvancedSettingsSection";

interface Props {
  inputs: SmeInputs;
  setInputs: Dispatch<SetStateAction<SmeInputs>>;
  /** Which wizard step to render: 0 = your business, 1 = energy & fuel. */
  step: number;
}

export const SME_INPUT_STEPS = ["Your business", "Energy & fuel"];

/**
 * Composes the SME wizard's two steps from per-section components (BusinessInfoSection,
 * Scope2ElectricitySection, Scope1FuelSection, AdvancedSettingsSection) — previously one ~600-line
 * component with all four sections' JSX and every patch helper inline. The step boundary already
 * matched the natural section split (step 0 = business info, step 1 = the three energy/fuel
 * cards), so this is a direct extraction, not a redesign: same fields, same order, same behavior.
 */
export function InputForm({ inputs, setInputs, step }: Props) {
  const patchers = useSmeFormPatchers(setInputs);

  const toggleEcm = (id: string) => {
    const set = new Set(inputs.baseline.implementedOrInProgressEcmIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patchers.patchBaseline("implementedOrInProgressEcmIds", Array.from(set));
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-soft">
        <span className="text-red-500">*</span> required — everything else is optional and can be refined later.
      </p>

      {step === 0 && <BusinessInfoSection inputs={inputs} setInputs={setInputs} patchers={patchers} toggleEcm={toggleEcm} />}

      {step === 1 && (
        <>
          <Scope2ElectricitySection inputs={inputs} setInputs={setInputs} patchers={patchers} />
          <Scope1FuelSection inputs={inputs} patchers={patchers} />
          <AdvancedSettingsSection inputs={inputs} patchers={patchers} />
        </>
      )}
    </div>
  );
}
