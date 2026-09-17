export function formatSgd(n: number): string {
  return `S$${Math.round(n).toLocaleString("en-SG")}`;
}

export function formatSgdRange(low: number, high: number): string {
  return `${formatSgd(low)} – ${formatSgd(high)}`;
}

export function formatTonnes(n: number): string {
  return `${Math.round(n).toLocaleString("en-SG")} tCO₂e`;
}
