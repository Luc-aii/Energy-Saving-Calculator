"use client";

import { useId, isValidElement, cloneElement, type ReactElement, type ReactNode } from "react";

/**
 * Associates the hint via aria-describedby rather than nesting it inside the
 * <label> — nesting made the field's accessible name the label text PLUS the
 * hint paragraph, which is verbose for screen readers and ambiguous for
 * anything doing label-text lookups (usability finding L1).
 */
export function FieldRow({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  const inputId = useId();
  const hintId = useId();
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; "aria-describedby"?: string; required?: boolean }>, {
        id: inputId,
        "aria-describedby": hint ? hintId : undefined,
        ...(required ? { required: true } : {}),
      })
    : children;
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={inputId} className="font-medium text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {child}
      {hint && (
        <span id={hintId} className="text-xs text-ink-soft">
          {hint}
        </span>
      )}
    </div>
  );
}

export const inputClass =
  "rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

/** Shared checkbox styling — a bit larger than the browser default, with room to breathe when several wrap onto multiple lines. */
export const checkboxInputClass = "h-4 w-4 shrink-0 rounded border-border accent-brand-500";
export const checkboxLabelClass = "flex items-center gap-2 text-xs text-ink-soft";

export function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="animate-step rounded-2xl border border-border bg-card p-5 shadow-sm shadow-brand-700/5">
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {subtitle && <p className="mb-3 text-xs text-ink-soft">{subtitle}</p>}
      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">{children}</div>
    </div>
  );
}
