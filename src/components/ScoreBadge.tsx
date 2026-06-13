import type { DayScore } from "../types";

const pillStyles: Record<DayScore, string> = {
  perfect: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  good: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  okay: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  bad: "bg-red-500/20 text-red-300 border-red-500/40",
};

const dotFillColors: Record<DayScore, string> = {
  perfect: "bg-violet-400",
  good: "bg-emerald-400",
  okay: "bg-amber-400",
  bad: "bg-red-400",
};

export function ScoreBadge({
  score,
  variant = "pill",
  className,
  isToday = false,
}: {
  score: DayScore | null;
  variant?: "pill" | "dot";
  className?: string;
  isToday?: boolean;
}) {
  if (variant === "pill") {
    if (!score) {
      return (
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-500">
          —
        </span>
      );
    }
    return (
      <span
        className={`rounded-full border px-2 py-0.5 text-xs capitalize ${pillStyles[score]} ${className ?? ""}`}
      >
        {score}
      </span>
    );
  }

  const fillClass = isToday
    ? "score-badge-today"
    : score
      ? dotFillColors[score]
      : "bg-slate-600";

  const ariaLabel = isToday
    ? score
      ? `Today, ${score} day score`
      : "Today, no score"
    : score
      ? `${score} day score`
      : "No score";

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={`inline-block shrink-0 rounded-full ${fillClass} ${className ?? "h-2.5 w-2.5"}`}
    />
  );
}
