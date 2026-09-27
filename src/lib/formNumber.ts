/**
 * Every numeric field across both input forms is a physical quantity or a dollar amount — none of
 * them can legitimately be negative — so this clamps at the source rather than letting a mistyped
 * "-5000" flow into the engine, where only an explicit `> 0` check (not a truthiness check) would
 * have caught it (usability finding H2). Previously duplicated identically in InputForm.tsx and
 * MncInputForm.tsx.
 */
export function numOrUndef(v: string): number | undefined {
  if (v === "") return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) return undefined;
  return Math.max(n, 0);
}

/** Same non-negative guard as numOrUndef, for required (non-optional) numeric fields that default to 0 rather than undefined. */
export function nonNegNum(v: string): number {
  return Math.max(Number(v) || 0, 0);
}
