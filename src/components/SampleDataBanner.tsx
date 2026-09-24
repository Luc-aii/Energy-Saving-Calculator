/**
 * Shown until the user makes their first edit — both wizards open pre-filled
 * with realistic-looking sample data so people can see the tool working, but
 * that convenience was also the calculator's biggest usability risk (finding
 * H1): the sample numbers fed real results without any indication they
 * weren't the user's own. This makes that explicit and offers a clean start.
 */
export function SampleDataBanner({ onClear }: { onClear: () => void }) {
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="flex-1">
        <span aria-hidden="true">⚠</span>{" "}
        <span className="font-semibold">This form is pre-filled with example figures</span> so you can see how the calculator works — every
        number below is a sample, not yours. Replace them with your own data before treating any result as real, or start from a blank form.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 rounded-full border border-amber-400 bg-white px-3 py-1.5 font-medium text-amber-900 transition hover:bg-amber-100"
      >
        Clear all fields
      </button>
    </div>
  );
}
