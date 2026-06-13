type Props = {
  value: number;
  /** Highest value this slider can reach before the group hits 100. */
  max: number;
  onChange: (value: number) => void;
};

export function ScoreWeightSlider({ value, max, onChange }: Props) {
  /** Blocked portion of the 0–100 track above this slider's max. */
  const lockedPct = Math.max(0, 100 - max);

  return (
    <div className="score-weight-slider relative flex min-w-0 flex-1 items-center">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-slate-700"
        aria-hidden
      >
        {lockedPct > 0 ? (
          <div
            className="absolute inset-y-0 right-0 rounded-r-full bg-red-500/30"
            style={{ width: `${lockedPct}%` }}
          />
        ) : null}
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => {
          const requested = parseInt(e.target.value, 10) || 0;
          onChange(Math.min(requested, max));
        }}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="score-weight-range score-weight-range--overlay relative z-10 w-full"
      />
    </div>
  );
}
