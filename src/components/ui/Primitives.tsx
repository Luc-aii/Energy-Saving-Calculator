import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-sm shadow-brand-700/5 ${className}`}>{children}</div>
  );
}

export function KpiStat({
  icon,
  label,
  value,
  caption,
  tone = "default",
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  caption?: string;
  tone?: "default" | "brand" | "warn";
}) {
  const valueColor = tone === "brand" ? "text-brand-600" : tone === "warn" ? "text-accent-amber" : "text-ink";
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
        {icon}
        {label}
      </span>
      <span key={value} className={`animate-value-update break-words rounded text-xl font-bold sm:text-2xl ${valueColor}`}>{value}</span>
      {caption && <span className="text-xs text-ink-soft">{caption}</span>}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-ink transition hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export const modernInputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function ModernField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

/** A number field with a bounded, meaningful range gets a slider + live value pill (matches the modern reference UI); open-ended magnitude fields (kWh, S$) stay plain inputs since a slider can't usefully span 6 orders of magnitude. */
export function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-ink">{label}</span>
        <span key={value} className="animate-value-update rounded px-1 text-sm font-semibold text-brand-600">
          {unit}
          {value.toLocaleString()}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-brand-500"
      />
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </div>
  );
}

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
    </div>
  );
}
