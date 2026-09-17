"use client";

import { useMemo, useState } from "react";
import { SmeWizard } from "@/components/SmeWizard";
import { McnWizard } from "@/components/McnWizard";
import { calculateSme } from "@/lib/calc/engine";
import { calculateMnc } from "@/lib/calc/mncEngine";
import { compareScenarios } from "@/lib/calc/scenarioComparison";
import { compareMncScenarios } from "@/lib/calc/mncScenarioComparison";
import { defaultSmeInputs } from "@/lib/defaultInputs";
import { defaultMncInputs } from "@/lib/defaultMncInputs";

type Mode = "SME" | "MNC";

export default function Home() {
  const [mode, setMode] = useState<Mode>("SME");
  const [smeInputs, setSmeInputs] = useState(defaultSmeInputs);
  const [mncInputs, setMncInputs] = useState(defaultMncInputs);

  const smeResult = useMemo(() => calculateSme(smeInputs), [smeInputs]);
  const smeScenarios = useMemo(() => compareScenarios(smeInputs), [smeInputs]);
  const mncResult = useMemo(() => calculateMnc(mncInputs), [mncInputs]);
  const mncScenarios = useMemo(() => compareMncScenarios(mncInputs), [mncInputs]);

  return (
    <div className="min-h-full w-full max-w-full overflow-x-hidden bg-page">
      <header className="no-print border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-ink">PEAK Calculator</h1>
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
          <SmeWizard inputs={smeInputs} setInputs={setSmeInputs} result={smeResult} scenarioComparison={smeScenarios} />
        </main>
      ) : (
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <McnWizard inputs={mncInputs} setInputs={setMncInputs} result={mncResult} scenarioComparison={mncScenarios} />
        </main>
      )}
    </div>
  );
}
