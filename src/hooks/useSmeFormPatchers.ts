import type { Dispatch, SetStateAction } from "react";
import type { SmeInputs } from "@/lib/types/inputs";

/**
 * The SME input form's state-update helpers, extracted out of InputForm.tsx (which had these
 * defined inline alongside a ~600-line return block covering every wizard step). Each helper is a
 * simple, pure closure over setInputs — genuinely reusable across whichever step/section needs it,
 * not step-specific logic, so a shared hook is the right home rather than duplicating a patcher in
 * every section component that needs it.
 */
export function useSmeFormPatchers(setInputs: Dispatch<SetStateAction<SmeInputs>>) {
  const patch = <K extends keyof SmeInputs>(key: K, value: SmeInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const patchUniversal = <K extends keyof SmeInputs["universal"]>(key: K, value: SmeInputs["universal"][K]) =>
    setInputs((prev) => ({ ...prev, universal: { ...prev.universal, [key]: value } }));

  const patchEnergy = <K extends keyof SmeInputs["energy"]>(key: K, value: SmeInputs["energy"][K]) =>
    setInputs((prev) => ({ ...prev, energy: { ...prev.energy, [key]: value } }));

  const patchFuel = <K extends keyof SmeInputs["fuelFleet"]>(key: K, value: SmeInputs["fuelFleet"][K]) =>
    setInputs((prev) => ({ ...prev, fuelFleet: { ...prev.fuelFleet, [key]: value } }));

  const patchRefrigerants = <K extends keyof SmeInputs["refrigerants"]>(key: K, value: SmeInputs["refrigerants"][K]) =>
    setInputs((prev) => ({ ...prev, refrigerants: { ...prev.refrigerants, [key]: value } }));

  const patchScope3 = <K extends keyof SmeInputs["scope3"]>(key: K, value: SmeInputs["scope3"][K]) =>
    setInputs((prev) => ({ ...prev, scope3: { ...prev.scope3, [key]: value } }));

  const patchBaseline = <K extends keyof SmeInputs["baseline"]>(key: K, value: SmeInputs["baseline"][K]) =>
    setInputs((prev) => ({ ...prev, baseline: { ...prev.baseline, [key]: value } }));

  const patchSensitivity = <K extends keyof SmeInputs["sensitivity"]>(key: K, value: SmeInputs["sensitivity"][K]) =>
    setInputs((prev) => ({ ...prev, sensitivity: { ...prev.sensitivity, [key]: value } }));

  return { patch, patchUniversal, patchEnergy, patchFuel, patchRefrigerants, patchScope3, patchBaseline, patchSensitivity };
}

export type SmeFormPatchers = ReturnType<typeof useSmeFormPatchers>;
