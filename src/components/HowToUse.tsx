"use client";

import { useState } from "react";
import { Card, PrimaryButton } from "./ui/Primitives";
import type { StepGuide } from "@/lib/stepFieldGuides";

/** Contextual field-by-field help, scoped to whichever wizard step you're currently on — opens straight to that step's guide, but you can flip to any other step's guide without leaving the modal. */
export function HowToUse({ currentStep, guides, showAiTip = false }: { currentStep: number; guides: StepGuide[]; showAiTip?: boolean }) {
  const [open, setOpen] = useState(false);
  const [viewingStep, setViewingStep] = useState(currentStep);

  const guide = guides[viewingStep];

  return (
    <>
      <button
        onClick={() => {
          setViewingStep(currentStep);
          setOpen(true);
        }}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand-400 hover:text-brand-600"
      >
        <span>❓</span> How to use this step
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setOpen(false)}>
          <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {guides.map((g, i) => (
                  <button
                    key={g.title}
                    onClick={() => setViewingStep(i)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      i === viewingStep ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                    }`}
                  >
                    {i + 1}. {g.title}
                  </button>
                ))}
              </div>

              <h3 className="text-lg font-bold text-ink">{guide.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{guide.intro}</p>

              <ul className="mt-4 flex flex-col gap-3">
                {guide.fields.map((f) => (
                  <li key={f.field}>
                    <p className="text-sm font-semibold text-ink">{f.field}</p>
                    <p className="text-xs text-ink-soft">{f.help}</p>
                  </li>
                ))}
              </ul>

              {showAiTip && viewingStep === 0 && (
                <p className="mt-4 rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
                  Tip: use &quot;Let AI help me fill this in&quot; above to pre-fill this step from a plain-English description of
                  your business — you&apos;ll always get to review before anything is applied.
                </p>
              )}

              <div className="mt-4 flex justify-end">
                <PrimaryButton onClick={() => setOpen(false)}>Got it</PrimaryButton>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
