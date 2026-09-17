"use client";

import { useState } from "react";
import { inputClass } from "./FormField";

/**
 * PRD section 14.5 (formerly 17.5) sales CTA layer. There is no CRM/backend
 * wired up here — "Download PDF" captures the results panel client-side into
 * a real paginated PDF file (no server round-trip), and the other three
 * actions are front-end-only stubs that capture lead details locally and
 * show a confirmation, with no network call.
 */
export function CtaPanel({ companyName }: { companyName: string }) {
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const requestLead = (action: string) => {
    setSubmitted(null);
    setPdfError(null);
    setShowLeadForm(true);
    setPendingAction(action);
  };

  const submitLead = async () => {
    if (!name || !email) return;
    if (pendingAction === "pdf") {
      setShowLeadForm(false);
      setGeneratingPdf(true);
      try {
        // jsPDF + html2canvas-pro are hefty and only needed here — code-split them out of the main bundle.
        const { downloadElementAsPdf } = await import("@/lib/pdf");
        const filename = `${companyName.replace(/[^a-z0-9]+/gi, "-")}-decarbonisation-illustration.pdf`;
        await downloadElementAsPdf("printable-report", filename);
      } catch {
        setPdfError("Could not generate the PDF in this browser — try again, or use your browser's print-to-PDF instead.");
      } finally {
        setGeneratingPdf(false);
      }
    } else {
      setSubmitted(`Thanks ${name} — this is a front-end stub only (no CRM connected). In production, "${pendingAction}" would now notify a Schneider advisor.`);
      setShowLeadForm(false);
    }
  };

  return (
    <div className="no-print rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
      <h3 className="mb-2 text-sm font-bold text-ink">What would you like to do next?</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CtaButton label={generatingPdf ? "Generating PDF..." : "📋 Download Illustration PDF"} onClick={() => requestLead("pdf")} disabled={generatingPdf} />
        <CtaButton label="📅 Book a Free Site Energy Audit" onClick={() => requestLead("audit")} />
        <CtaButton label="💬 Talk to a Schneider Advisor" onClick={() => requestLead("advisor")} />
        <CtaButton label="📧 Email This Illustration" onClick={() => requestLead("email")} />
      </div>

      {showLeadForm && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-xs text-ink-soft">Enter your details to continue (used for this illustration only).</p>
          <input className={inputClass} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputClass} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex gap-2">
            <button
              className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
              onClick={submitLead}
            >
              Continue
            </button>
            <button
              className="rounded-full border border-border px-3 py-1.5 text-xs text-ink-soft hover:border-brand-400"
              onClick={() => setShowLeadForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {submitted && <p className="mt-2 text-xs text-brand-600">{submitted}</p>}
      {pdfError && <p className="mt-2 text-xs text-red-600">{pdfError}</p>}
    </div>
  );
}

function CtaButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-border px-3 py-2 text-left text-xs font-medium text-ink-soft transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
