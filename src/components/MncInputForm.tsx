"use client";

import type { Dispatch, SetStateAction } from "react";
import type { MncInputs } from "@/lib/types/mncInputs";
import { useMncFormPatchers } from "@/hooks/useMncFormPatchers";
import { MncBusinessInfoSection } from "./MncBusinessInfoSection";
import { MncSitesSection } from "./MncSitesSection";
import { MncFuelFleetSection } from "./MncFuelFleetSection";
import { MncRefrigerantsSection } from "./MncRefrigerantsSection";
import { MncAdvancedSettingsSection } from "./MncAdvancedSettingsSection";

interface Props {
  inputs: MncInputs;
  setInputs: Dispatch<SetStateAction<MncInputs>>;
  /** Which wizard step to render: 0 = your business, 1 = energy & fuel. */
  step: number;
}

export const MNC_INPUT_STEPS = ["Your business", "Energy & fuel"];

/**
 * Composes the MNC wizard's two steps from per-section components (MncBusinessInfoSection,
 * MncSitesSection, MncFuelFleetSection, MncRefrigerantsSection, MncAdvancedSettingsSection) —
 * previously one ~500-line component with all five sections' JSX and every patch helper inline.
 * Mirrors the same extraction already done for InputForm.tsx/SME mode: same fields, same order,
 * same behavior, just split along the section boundaries the JSX already had.
 */
export function MncInputForm({ inputs, setInputs, step }: Props) {
  const patchers = useMncFormPatchers(setInputs);

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

      {step === 0 && <MncBusinessInfoSection inputs={inputs} patchers={patchers} toggleEcm={toggleEcm} />}

      {step === 1 && (
        <>
          <MncSitesSection inputs={inputs} patchers={patchers} />
          <MncFuelFleetSection inputs={inputs} patchers={patchers} />
          <MncRefrigerantsSection inputs={inputs} patchers={patchers} />
          <MncAdvancedSettingsSection inputs={inputs} patchers={patchers} />
        </>
      )}
    </div>
  );
}
