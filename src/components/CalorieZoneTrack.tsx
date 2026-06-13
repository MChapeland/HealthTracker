import type { ReactNode } from "react";
import { calorieTargetPercents, type CalorieTargets } from "../lib/calories";

type Props = CalorieTargets & {
  fillWidthPct?: number;
  fillClassName?: string;
  children?: ReactNode;
  className?: string;
};

export function CalorieZoneTrack({
  calorieIdealMin,
  calorieIdealMax,
  calorieWarningBelow,
  calorieWarning,
  calorieMax,
  fillWidthPct,
  fillClassName,
  children,
  className = "",
}: Props) {
  const { warnBelowEnd, idealStart, idealEnd, warnEnd } = calorieTargetPercents({
    calorieIdealMin,
    calorieIdealMax,
    calorieWarningBelow,
    calorieWarning,
    calorieMax,
  });

  return (
    <div className={`relative ${className}`.trim()}>
      <div className="relative h-4 overflow-hidden rounded-full bg-slate-800">
        <div
          className="absolute inset-y-0 bg-red-500/30"
          style={{ left: 0, width: `${warnBelowEnd}%` }}
        />
        <div
          className="absolute inset-y-0 bg-amber-500/30"
          style={{
            left: `${warnBelowEnd}%`,
            width: `${idealStart - warnBelowEnd}%`,
          }}
        />
        <div
          className="absolute inset-y-0 bg-emerald-600/40"
          style={{
            left: `${idealStart}%`,
            width: `${idealEnd - idealStart}%`,
          }}
        />
        <div
          className="absolute inset-y-0 bg-amber-500/30"
          style={{
            left: `${idealEnd}%`,
            width: `${warnEnd - idealEnd}%`,
          }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-red-500/30"
          style={{ left: `${warnEnd}%` }}
        />
        {fillWidthPct != null && fillClassName && (
          <div
            className={`absolute inset-y-0 left-0 z-[1] ${fillClassName}`}
            style={{ width: `${fillWidthPct}%` }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
