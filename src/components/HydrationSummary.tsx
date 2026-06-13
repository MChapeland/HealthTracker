import { formatWaterMl, waterGoalMet } from "../lib/hydration";
import type { DayRecord, Settings } from "../types";
import { SectionHeader } from "./SectionHeader";

interface Props {
  settings: Settings;
  day: DayRecord | null;
  className?: string;
}

export function HydrationSummary({ settings, day, className = "" }: Props) {
  const waterMl = day?.waterMl ?? null;
  const goalMl = settings.dailyWaterGoalMl;
  const current = waterMl ?? 0;
  const progress = goalMl > 0 ? Math.min(100, (current / goalMl) * 100) : 0;
  const met = waterGoalMet(waterMl, goalMl);
  const isZero = current <= 0;

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/50 p-4 ${className}`}
    >
      <SectionHeader
        kind="water"
        className="mb-4 text-sm font-medium text-slate-400"
      >
        Hydration
      </SectionHeader>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={`text-lg font-bold tabular-nums ${
              met ? "text-emerald-400" : isZero ? "text-slate-500" : "text-slate-200"
            }`}
          >
            {formatWaterMl(current)} / {formatWaterMl(goalMl)}
          </p>
        </div>
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
