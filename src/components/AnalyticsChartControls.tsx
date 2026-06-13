import type { ReactNode } from "react";

const TOGGLE_ACTIVE =
  "border-accent-50 bg-accent-muted text-accent-soft hover:bg-accent-muted-hover";
const TOGGLE_INACTIVE =
  "border-transparent bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300";

export function AnalyticsChartIconToggle({
  iconClass,
  label,
  pressed,
  onToggle,
}: {
  iconClass: string;
  label: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onToggle}
      className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors focus:outline-none ${
        pressed ? TOGGLE_ACTIVE : TOGGLE_INACTIVE
      }`}
    >
      <i className={`${iconClass} text-sm`} aria-hidden />
    </button>
  );
}

export function AnalyticsChartToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">{children}</div>
  );
}

export const ANALYTICS_TREND_ICON = "fa-solid fa-arrow-trend-up";
export const ANALYTICS_AVERAGE_ICON = "fa-solid fa-grip-lines";
export const ANALYTICS_GOAL_ICON = "fa-solid fa-bullseye";
