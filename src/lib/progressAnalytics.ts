import { formatShortDate } from "./dates";
import { workoutAmountUnitLabel } from "./workoutLibrary";
import type {
  ExerciseLog,
  ExerciseLogSet,
  RoutineLogEntry,
  RoutineLogSession,
  WorkoutAmountUnit,
} from "../types";

export function amountMetricLabel(unit: WorkoutAmountUnit): string {
  switch (unit) {
    case "reps":
      return "Reps";
    case "mins":
      return "Minutes";
    case "hrs":
      return "Hours";
    case "km":
      return "Distance (km)";
    default:
      return "Amount";
  }
}

export function formatLoggedAmount(amount: number, unit: WorkoutAmountUnit): string {
  const value = amount % 1 === 0 ? String(Math.round(amount)) : String(amount);
  return `${value} ${workoutAmountUnitLabel(unit)}`;
}

export function formatCaloriesBurned(calories: number | null | undefined): string {
  if (calories == null || calories <= 0) return "—";
  return `-${Math.round(calories)} kcal`;
}

export function sessionTotalAmount(log: ExerciseLog): number {
  return log.sets.reduce((sum, s) => sum + s.amount, 0);
}

export function sessionMaxWeight(log: ExerciseLog): number | null {
  const weights = log.sets
    .map((s) => s.weightKg)
    .filter((w): w is number => w != null && w > 0);
  if (weights.length === 0) return null;
  return Math.max(...weights);
}

export function sessionBestSetAmount(log: ExerciseLog): number | null {
  if (log.sets.length === 0) return null;
  return Math.max(...log.sets.map((s) => s.amount));
}

export function formatExerciseSetLine(
  set: ExerciseLogSet,
  unit: WorkoutAmountUnit,
  setIndex: number
): string {
  const parts = [`Set ${setIndex + 1}: ${formatLoggedAmount(set.amount, unit)}`];
  if (set.weightKg != null && set.weightKg > 0) {
    parts.push(`${set.weightKg} kg`);
  }
  return parts.join(" · ");
}

export function formatExerciseSessionSummary(log: ExerciseLog): string {
  const unit = log.amountUnit;
  if (log.sets.length === 0) return "No sets";
  const setParts = log.sets.map((s) => {
    const amount = formatLoggedAmount(s.amount, unit);
    if (s.weightKg != null && s.weightKg > 0) {
      return `${amount} @ ${s.weightKg} kg`;
    }
    return amount;
  });
  const cal = formatCaloriesBurned(log.calories);
  return `${setParts.join(", ")}${cal !== "—" ? ` · ${cal}` : ""}`;
}

export type ProgressChartPoint = {
  date: string;
  label: string;
  amount: number;
  calories: number | null;
  weightKg: number | null;
};

export function exerciseLogsToChartPoints(logs: ExerciseLog[]): ProgressChartPoint[] {
  return logs.map((log) => ({
    date: log.dayDate,
    label: formatShortDate(log.dayDate),
    amount: sessionTotalAmount(log),
    calories: log.calories,
    weightKg: sessionMaxWeight(log),
  }));
}

export function sessionCaloriesPoints(
  sessions: RoutineLogSession[]
): { date: string; label: string; calories: number }[] {
  return sessions.map((s) => ({
    date: s.dayDate,
    label: formatShortDate(s.dayDate),
    calories: s.totalCalories,
  }));
}

export function entriesForExercise(
  sessions: RoutineLogSession[],
  exerciseId: number
): ProgressChartPoint[] {
  const points: ProgressChartPoint[] = [];
  for (const session of sessions) {
    const entry = session.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry) continue;
    points.push({
      date: session.dayDate,
      label: formatShortDate(session.dayDate),
      amount: entry.amount,
      calories: entry.calories,
      weightKg: entry.weightKg,
    });
  }
  return points;
}

export function improvementPercent(
  first: number | null | undefined,
  latest: number | null | undefined
): number | null {
  if (first == null || latest == null || first <= 0) return null;
  return Math.round(((latest - first) / first) * 100);
}

export function bestAmount(logs: ExerciseLog[], unit: WorkoutAmountUnit): number | null {
  if (logs.length === 0) return null;
  if (unit === "reps") {
    const weights = logs
      .map(sessionMaxWeight)
      .filter((w): w is number => w != null);
    if (weights.length > 0) return Math.max(...weights);
  }
  return Math.max(...logs.map(sessionBestSetAmount).filter((a): a is number => a != null));
}

export function latestSessionHighlight(
  logs: ExerciseLog[],
  unit: WorkoutAmountUnit
): string | null {
  if (logs.length === 0) return null;
  const sorted = [...logs].sort((a, b) => a.dayDate.localeCompare(b.dayDate));
  const latest = sorted[sorted.length - 1];
  if (unit === "reps") {
    const maxW = sessionMaxWeight(latest);
    if (maxW != null) return `${maxW} kg max`;
  }
  const best = sessionBestSetAmount(latest);
  return best != null ? formatLoggedAmount(best, unit) : null;
}

export function showWeightProgress(
  unit: WorkoutAmountUnit,
  logs: ExerciseLog[]
): boolean {
  return (
    unit === "reps" &&
    logs.some((log) => log.sets.some((s) => s.weightKg != null && s.weightKg > 0))
  );
}

export function summarizeEntry(entry: RoutineLogEntry): string {
  const parts = [formatLoggedAmount(entry.amount, entry.amountUnit)];
  if (entry.weightKg != null && entry.weightKg > 0) {
    parts.push(`${entry.weightKg} kg`);
  }
  const cal = formatCaloriesBurned(entry.calories);
  if (cal !== "—") parts.push(cal);
  return parts.join(" · ");
}
