"use client";

import type { MncInputs, RefrigerantEntry } from "@/lib/types/mncInputs";
import { FieldRow, inputClass } from "./FormField";
import { NumberInput } from "./ui/NumberInput";
import { numOrUndef } from "@/lib/formNumber";
import type { MncFormPatchers } from "@/hooks/useMncFormPatchers";

/** Wizard step 1, third block: fugitive refrigerant and SF6 emissions. Split out of MncInputForm.tsx. */
export function MncRefrigerantsSection({ inputs, patchers }: { inputs: MncInputs; patchers: MncFormPatchers }) {
  const { patch } = patchers;

  const updateRefrigerantEntry = (index: number, patchFn: (e: RefrigerantEntry) => RefrigerantEntry) => {
    const entries = inputs.refrigerants.entries.map((e, i) => (i === index ? patchFn(e) : e));
    patch("refrigerants", { ...inputs.refrigerants, entries });
  };

  const addRefrigerantEntry = () => {
    patch("refrigerants", { ...inputs.refrigerants, entries: [...inputs.refrigerants.entries, { gasType: "R-410A", kgPerYear: 0 }] });
  };

  const removeRefrigerantEntry = (index: number) => {
    patch("refrigerants", { ...inputs.refrigerants, entries: inputs.refrigerants.entries.filter((_, i) => i !== index) });
  };

  return (
    <div className="animate-step rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-ink">Scope 1 — Refrigerants & SF6</h3>
          <p className="text-xs text-ink-soft">Fugitive emissions only — adds to your Scope 1 total and regulatory-exposure check, no $ effect.</p>
        </div>
        <button type="button" onClick={addRefrigerantEntry} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-400">
          + Add gas
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {inputs.refrigerants.entries.map((entry, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select className={inputClass} value={entry.gasType} onChange={(e) => updateRefrigerantEntry(i, (prev) => ({ ...prev, gasType: e.target.value as RefrigerantEntry["gasType"] }))}>
              <option value="R-410A">R-410A</option>
              <option value="R-32">R-32</option>
              <option value="R-134a">R-134a</option>
              <option value="R-22">R-22 (phased out)</option>
              <option value="Unknown">Unknown</option>
            </select>
            <NumberInput className={inputClass} placeholder="kg/year" value={entry.kgPerYear} onChange={(n) => updateRefrigerantEntry(i, (prev) => ({ ...prev, kgPerYear: n }))} />
            <button type="button" onClick={() => removeRefrigerantEntry(i)} className="text-xs text-red-600">Remove</button>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <FieldRow label="SF6 leakage (kg/year)" hint="Electrical equipment — utilities/data centres">
          <input type="number" className={inputClass} value={inputs.refrigerants.sf6LeakageKgPerYear ?? ""} onChange={(e) => patch("refrigerants", { ...inputs.refrigerants, sf6LeakageKgPerYear: numOrUndef(e.target.value) })} />
        </FieldRow>
      </div>
    </div>
  );
}
