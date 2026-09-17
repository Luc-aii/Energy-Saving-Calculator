"use client";

import { useState } from "react";
import type { ResultContext } from "@/lib/ai/resultContext";

/**
 * Both actions here send only the already-computed ResultContext (see
 * src/lib/ai/resultContext.ts) to the AI — it phrases facts into prose, it
 * never calculates anything. Explicit button clicks rather than
 * auto-fetch-on-every-keystroke, since the API key is quota-limited and a
 * live-updating wizard would otherwise burn through it in seconds.
 */
export function AiSummaryCard({ context, fallbackNarrative }: { context: ResultContext; fallbackNarrative: string }) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);

  const [insights, setInsights] = useState<{ gap: string; recommendation: string }[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const generateNarrative = async () => {
    setNarrativeLoading(true);
    setNarrativeError(null);
    try {
      const res = await fetch("/api/ai/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      const data = await res.json();
      if (!res.ok) {
        setNarrativeError(data.error ?? "AI summary failed.");
        return;
      }
      setNarrative(data.narrative);
    } catch {
      setNarrativeError("Could not reach the AI service.");
    } finally {
      setNarrativeLoading(false);
    }
  };

  const generateInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      const data = await res.json();
      if (!res.ok) {
        setInsightsError(data.error ?? "AI insights failed.");
        return;
      }
      setInsights(data.insights);
    } catch {
      setInsightsError("Could not reach the AI service.");
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <div className="animate-step rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">Summary</h3>
        <button
          className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-brand-600 hover:border-brand-400 disabled:opacity-50"
          onClick={generateNarrative}
          disabled={narrativeLoading}
        >
          {narrativeLoading ? "Writing..." : narrative ? "✨ Regenerate with AI" : "✨ Write with AI"}
        </button>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{narrative ?? fallbackNarrative}</p>
      {narrativeError && <p className="mt-1 text-xs text-red-600">{narrativeError}</p>}
      <p className="mt-2 text-[10px] italic text-ink-soft">
        {narrative ? "Generated live by Gemini from your computed results — every number is copied, not calculated by the AI." : "Generated from a fixed template, not a live AI model."}
      </p>

      <div className="mt-4 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wide text-ink-soft">What you can improve</h4>
          <button
            className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-brand-600 hover:border-brand-400 disabled:opacity-50"
            onClick={generateInsights}
            disabled={insightsLoading}
          >
            {insightsLoading ? "Thinking..." : insights ? "✨ Regenerate" : "✨ Get AI insights"}
          </button>
        </div>
        {insightsError && <p className="mt-1 text-xs text-red-600">{insightsError}</p>}
        {insights && (
          <ul className="mt-2 flex flex-col gap-2.5">
            {insights.map((point, i) => (
              <li key={i} className="text-sm">
                <p className="flex gap-2 text-ink-soft">
                  <span className="text-brand-500">→</span>
                  {point.gap}
                </p>
                <p className="pl-5 text-xs font-medium text-brand-600">✓ {point.recommendation}</p>
              </li>
            ))}
          </ul>
        )}
        {!insights && !insightsLoading && (
          <p className="mt-1 text-xs text-ink-soft">
            Grounded in your computed results and product recommendations — click to generate targeted next steps.
          </p>
        )}
      </div>
    </div>
  );
}

