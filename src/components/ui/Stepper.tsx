export function Stepper({
  steps,
  current,
  onJump,
}: {
  steps: string[];
  current: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((label, i) => {
        const state = i === current ? "current" : i < current ? "done" : "upcoming";
        return (
          <button
            key={label}
            onClick={() => onJump(i)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              state === "current"
                ? "bg-brand-500 text-white"
                : state === "done"
                  ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
                  : "bg-transparent text-ink-soft hover:bg-brand-50"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                state === "current" ? "bg-white/25" : state === "done" ? "bg-brand-500 text-white" : "bg-border"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
