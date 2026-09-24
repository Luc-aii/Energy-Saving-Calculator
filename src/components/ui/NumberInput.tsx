"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

/**
 * A number input whose displayed text tracks exactly what's typed,
 * decoupled from the committed numeric value. A plain controlled
 * `<input type="number" value={n}>` bound directly to a required field
 * (e.g. investment amount, site count) snaps back to a default the instant
 * the field is cleared mid-edit — the browser then resets the caret to the
 * start, so further digits get prepended before that phantom leftover digit
 * instead of replacing it, corrupting the value (reported as the field
 * "blocking"/getting stuck after a set number of keystrokes). This keeps
 * the raw text authoritative while typing — including transiently empty —
 * and only re-syncs from the outside `value` when it changes for a reason
 * other than this field's own edits (e.g. "Clear all fields", a sample load).
 */
export function NumberInput({
  value,
  onChange,
  nonNegative = true,
  className,
  ...rest
}: {
  value: number;
  onChange: (n: number) => void;
  /** Clamp committed values to >=0 — true for every current use case (money, kWh, counts, %). */
  nonNegative?: boolean;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [text, setText] = useState(String(value));
  const lastCommitted = useRef(value);

  useEffect(() => {
    if (value !== lastCommitted.current) {
      setText(String(value));
      lastCommitted.current = value;
    }
  }, [value]);

  return (
    <input
      type="number"
      className={className}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw === "" || raw === "-") return; // mid-edit — don't force a premature commit
        const n = Number(raw);
        if (!Number.isFinite(n)) return;
        const committed = nonNegative ? Math.max(n, 0) : n;
        lastCommitted.current = committed;
        onChange(committed);
      }}
      onBlur={() => {
        // Left empty/invalid on blur — restore the last real value instead of showing a stale blank field.
        if (text === "" || !Number.isFinite(Number(text))) {
          setText(String(lastCommitted.current));
        }
      }}
      {...rest}
    />
  );
}
