import { formatTeethBrushings, teethGoalMet } from "../lib/teethBrushing";
import type { DayRecord, Settings } from "../types";
import { SectionHeader } from "./SectionHeader";

interface Props {
  settings: Settings;
  day: DayRecord | null;
  className?: string;
}

export function TeethBrushingSummary({ settings, day, className = "" }: Props) {
  const teethBrushings = day?.teethBrushings ?? null;
  const goal = settings.dailyTeethBrushingsGoal;
  const current = teethBrushings ?? 0;
  const progress = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const met = teethGoalMet(teethBrushings, goal);
  const isZero = current <= 0;

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/50 p-4 ${className}`}
    >
      <SectionHeader
        kind="teeth"
        className="mb-4 text-sm font-medium text-slate-400"
      >
        Teeth brushing
      </SectionHeader>
      <div className="space-y-2">
        <p
          className={`text-lg font-bold tabular-nums ${
            met ? "text-emerald-400" : isZero ? "text-slate-500" : "text-slate-200"
          }`}
        >
          {formatTeethBrushings(current, goal)}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              met ? "bg-emerald-500" : isZero ? "bg-slate-700" : "bg-accent"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
