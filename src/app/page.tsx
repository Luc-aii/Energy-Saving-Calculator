"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { SmeWizard } from "@/components/SmeWizard";
import { MncWizard } from "@/components/MncWizard";
import { calculateSme } from "@/lib/calc/engine";
import { calculateMnc } from "@/lib/calc/mncEngine";
import { compareScenarios } from "@/lib/calc/scenarioComparison";
import { compareMncScenarios } from "@/lib/calc/mncScenarioComparison";
import { defaultSmeInputs, blankSmeInputs } from "@/lib/defaultInputs";
import { defaultMncInputs, blankMncInputs } from "@/lib/defaultMncInputs";
import type { SmeInputs } from "@/lib/types/inputs";
import type { MncInputs } from "@/lib/types/mncInputs";

type Mode = "SME" | "MNC";

export default function Home() {
  const [mode, setMode] = useState<Mode>("SME");
  const [smeInputs, setSmeInputsRaw] = useState(defaultSmeInputs);
  const [mncInputs, setMncInputsRaw] = useState(defaultMncInputs);
  // True until the first edit — drives the "this is sample data" banner (usability finding H1).
  const [smeTouched, setSmeTouched] = useState(false);
  const [mncTouched, setMncTouched] = useState(false);

  const setSmeInputs = useCallback<Dispatch<SetStateAction<SmeInputs>>>((action) => {
    setSmeTouched(true);
    setSmeInputsRaw(action);
  }, []);
  const setMncInputs = useCallback<Dispatch<SetStateAction<MncInputs>>>((action) => {
    setMncTouched(true);
    setMncInputsRaw(action);
  }, []);
  const clearSme = useCallback(() => {
    setSmeTouched(true);
    setSmeInputsRaw(blankSmeInputs);
  }, []);
  const clearMnc = useCallback(() => {
    setMncTouched(true);
    setMncInputsRaw(blankMncInputs);
  }, []);

  const smeResult = useMemo(() => calculateSme(smeInputs), [smeInputs]);
  const smeScenarios = useMemo(() => compareScenarios(smeInputs), [smeInputs]);
  const mncResult = useMemo(() => calculateMnc(mncInputs), [mncInputs]);
  const mncScenarios = useMemo(() => compareMncScenarios(mncInputs), [mncInputs]);

  return (
    <div className="min-h-full w-full max-w-full overflow-x-hidden bg-page">
      <header className="no-print sticky top-0 z-20 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-ink">EcoStruxure Value Advisor</h1>
            <p className="text-sm text-ink-soft">Schneider Electric Emissions-to-Dollar Calculator — Singapore</p>
          </div>
          <div className="flex overflow-hidden rounded-full border border-border text-sm">
            <button
              className={`px-4 py-1.5 font-medium transition ${mode === "SME" ? "bg-brand-500 text-white" : "bg-card text-ink-soft hover:bg-brand-50"}`}
              onClick={() => setMode("SME")}
            >
              SME
            </button>
            <button
              className={`px-4 py-1.5 font-medium transition ${mode === "MNC" ? "bg-brand-500 text-white" : "bg-card text-ink-soft hover:bg-brand-50"}`}
              onClick={() => setMode("MNC")}
            >
              MNC
            </button>
          </div>
        </div>
      </header>

      {mode === "SME" ? (
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <SmeWizard
            inputs={smeInputs}
            setInputs={setSmeInputs}
            result={smeResult}
            scenarioComparison={smeScenarios}
            showSampleBanner={!smeTouched}
            onClearSample={clearSme}
          />
        </main>
      ) : (
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <MncWizard
            inputs={mncInputs}
            setInputs={setMncInputs}
            result={mncResult}
            scenarioComparison={mncScenarios}
            showSampleBanner={!mncTouched}
            onClearSample={clearMnc}
          />
        </main>
      )}
    </div>
  );
}
