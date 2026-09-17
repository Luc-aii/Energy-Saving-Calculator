"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Dispatch, SetStateAction } from "react";
import type { CalculationResult, ScenarioSummary } from "@/lib/types/results";
import type { SmeInputs } from "@/lib/types/inputs";
import { InputForm, SME_INPUT_STEPS } from "./InputForm";
import { LiveKpiStrip } from "./LiveKpiStrip";
import { HowToUse } from "./HowToUse";
import { Stepper } from "./ui/Stepper";
import { PrimaryButton, SecondaryButton } from "./ui/Primitives";
import { SME_STEP_GUIDES } from "@/lib/stepFieldGuides";

// Recharts (used only here) is heavy — code-split it out of the initial bundle so
// users who never reach the results step don't pay for it.
const ResultsPanel = dynamic(() => import("./ResultsPanel").then((m) => m.ResultsPanel), {
  ssr: false,
  loading: () => <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-ink-soft">Loading your results…</div>,
});

const ALL_STEPS = [...SME_INPUT_STEPS, "Your results"];

export function SmeWizard({
  inputs,
  setInputs,
  result,
  scenarioComparison,
}: {
  inputs: SmeInputs;
  setInputs: Dispatch<SetStateAction<SmeInputs>>;
  result: CalculationResult;
  scenarioComparison: ScenarioSummary[];
}) {
  const [step, setStep] = useState(0);
  const isResultsStep = step === ALL_STEPS.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stepper steps={ALL_STEPS} current={step} onJump={setStep} />
        <HowToUse currentStep={step} guides={SME_STEP_GUIDES} showAiTip />
      </div>

      <LiveKpiStrip companyName={inputs.universal.companyName} result={result} />

      {isResultsStep ? (
        <ResultsPanel
          companyName={inputs.universal.companyName}
          sector={inputs.universal.sector}
          mode="SME"
          result={result}
          scenarioComparison={scenarioComparison}
        />
      ) : (
        <InputForm inputs={inputs} setInputs={setInputs} step={step} />
      )}

      <div className="no-print flex justify-between">
        <SecondaryButton onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          ← Back
        </SecondaryButton>
        {!isResultsStep && (
          <PrimaryButton onClick={() => setStep((s) => Math.min(ALL_STEPS.length - 1, s + 1))}>
            {step === ALL_STEPS.length - 2 ? "See my results →" : "Next →"}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
