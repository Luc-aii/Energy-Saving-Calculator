import type { Dispatch, SetStateAction } from "react";
import type { MncInputs, MncSite } from "@/lib/types/mncInputs";

/**
 * The MNC input form's state-update helpers, extracted out of MncInputForm.tsx for the same
 * reason as useSmeFormPatchers.ts: these are simple, pure closures over setInputs, genuinely
 * reusable across whichever step/section needs them, not step-specific logic.
 */
export function useMncFormPatchers(setInputs: Dispatch<SetStateAction<MncInputs>>) {
  const patch = <K extends keyof MncInputs>(key: K, value: MncInputs[K]) => setInputs((prev) => ({ ...prev, [key]: value }));

  const patchFuel = <K extends keyof MncInputs["fuelFleet"]>(key: K, value: MncInputs["fuelFleet"][K]) =>
    setInputs((prev) => ({ ...prev, fuelFleet: { ...prev.fuelFleet, [key]: value } }));

  const patchScope3 = <K extends keyof MncInputs["scope3"]>(key: K, value: MncInputs["scope3"][K]) =>
    setInputs((prev) => ({ ...prev, scope3: { ...prev.scope3, [key]: value } }));

  const patchBaseline = <K extends keyof MncInputs["baseline"]>(key: K, value: MncInputs["baseline"][K]) =>
    setInputs((prev) => ({ ...prev, baseline: { ...prev.baseline, [key]: value } }));

  const patchSensitivity = <K extends keyof MncInputs["sensitivity"]>(key: K, value: MncInputs["sensitivity"][K]) =>
    setInputs((prev) => ({ ...prev, sensitivity: { ...prev.sensitivity, [key]: value } }));

  const patchSite = <K extends keyof MncSite>(id: string, key: K, value: MncSite[K]) =>
    setInputs((prev) => ({ ...prev, sites: prev.sites.map((s) => (s.id === id ? { ...s, [key]: value } : s)) }));

  return { patch, patchFuel, patchScope3, patchBaseline, patchSensitivity, patchSite };
}

export type MncFormPatchers = ReturnType<typeof useMncFormPatchers>;
