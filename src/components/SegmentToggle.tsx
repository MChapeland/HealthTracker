type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
};

export function SegmentToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: Props<T>) {
  return (
    <div
      className="inline-flex shrink-0 items-center rounded-lg border border-slate-700/50 bg-slate-800/40 p-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`cursor-pointer rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-slate-700/90 text-slate-200"
                : "text-slate-500 hover:text-slate-400"
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
