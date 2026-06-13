import {
  resolveWeightForMetabolism,
  resolveWorkoutCalories,
} from "../lib/metabolism";
import { isWorkoutValid } from "../lib/workout";
import type { DayRecord, Settings } from "../types";
import { SectionHeader } from "./SectionHeader";

interface Props {
  settings: Settings;
  day: DayRecord | null;
  dayWeight: number | null;
  className?: string;
}

function formatSteps(steps: number | null, goal: number): string {
  const count = steps ?? 0;
  return `${count.toLocaleString()} / ${goal.toLocaleString()}`;
}

function formatDuration(min: number | null): string {
  const value = min != null && min > 0 ? Math.round(min) : 0;
  return `${value} min`;
}

function formatCaloriesBurned(calories: number | null): string {
  const value = calories != null && calories > 0 ? calories : 0;
  if (value <= 0) return "0 kcal";
  return `-${value} kcal`;
}

function ActivityStat({
  label,
  value,
  valueClassName = "text-slate-200",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${valueClassName}`}>{value}</p>
    </div>
  );
}

export function PhysicalActivitySummary({
  settings,
  day,
  dayWeight,
  className = "",
}: Props) {
  const steps = day?.steps ?? null;
  const isZeroSteps = (steps ?? 0) <= 0;
  const metStepsGoal =
    steps != null && steps >= settings.dailyStepsGoal;
  const weightKg = resolveWeightForMetabolism(dayWeight, settings);
  const workoutDurationMin = day?.workoutDurationMin ?? null;
  const isZeroDuration =
    !isWorkoutValid(workoutDurationMin) || (workoutDurationMin ?? 0) <= 0;
  const workoutCalories =
    day && weightKg != null && isWorkoutValid(workoutDurationMin)
      ? resolveWorkoutCalories(day, weightKg)
      : null;
  const isZeroCalories = (workoutCalories ?? 0) <= 0;

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/50 p-4 ${className}`}
    >
      <SectionHeader
        kind="physicalActivity"
        className="mb-4 text-sm font-medium text-slate-400"
      >
        Physical Activity
      </SectionHeader>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_1px_minmax(0,2fr)] lg:gap-x-4 lg:gap-y-3">
        <SectionHeader
          kind="steps"
          as="p"
          className="text-xs font-medium text-slate-500 lg:col-start-1 lg:row-start-1"
        >
          Steps
        </SectionHeader>

        <div className="lg:col-start-1 lg:row-start-2">
          <ActivityStat
            label="Steps"
            value={formatSteps(steps, settings.dailyStepsGoal)}
            valueClassName={
              metStepsGoal
                ? "text-emerald-400"
                : isZeroSteps
                  ? "text-slate-500"
                  : "text-slate-200"
            }
          />
        </div>

        <div
          className="hidden bg-slate-800 lg:col-start-2 lg:row-start-2 lg:block lg:w-px"
          aria-hidden
        />

        <div className="border-t border-slate-800 pt-4 lg:contents">
          <SectionHeader
            kind="workout"
            as="p"
            className="text-xs font-medium text-slate-500 lg:col-start-3 lg:row-start-1"
          >
            Workout
          </SectionHeader>
          <div className="grid grid-cols-2 gap-4 lg:col-start-3 lg:row-start-2">
            <ActivityStat
              label="Duration"
              value={formatDuration(workoutDurationMin)}
              valueClassName={
                isZeroDuration ? "text-slate-500" : "text-slate-200"
              }
            />
            <ActivityStat
              label="Calories burned"
              value={formatCaloriesBurned(workoutCalories)}
              valueClassName={
                isZeroCalories ? "text-slate-500" : "text-slate-200"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
