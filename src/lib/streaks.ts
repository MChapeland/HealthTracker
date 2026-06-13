import { parseISO, differenceInCalendarDays } from "date-fns";
import { todayString, weekRangeForOffset } from "./dates";
import { waterGoalMet } from "./hydration";
import { teethGoalMet } from "./teethBrushing";
import type { DayRecord, Settings, Streaks } from "../types";

function isLogged(day: DayRecord): boolean {
  return (
    day.exists &&
    (day.weight != null ||
      day.steps != null ||
      day.workedOut ||
      day.totalCalories > 0 ||
      (day.notes != null && day.notes.length > 0) ||
      day.waterMl != null ||
      day.teethBrushings != null)
  );
}

function inCalorieGoal(day: DayRecord, settings: Settings): boolean {
  return (
    day.totalCalories >= settings.calorieIdealMin &&
    day.totalCalories <= settings.calorieIdealMax
  );
}

function metStepsGoal(day: DayRecord, settings: Settings): boolean {
  return day.steps != null && day.steps >= settings.dailyStepsGoal;
}

function countStreak(
  days: DayRecord[],
  predicate: (d: DayRecord) => boolean
): number {
  const today = todayString();
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));
  let start = 0;
  if (sorted[0]?.date === today && !predicate(sorted[0])) {
    start = 1;
  }

  let streak = 0;
  let expected: Date | null = null;

  for (let i = start; i < sorted.length; i++) {
    const day = sorted[i];
    if (!predicate(day)) break;
    const d = parseISO(day.date);
    if (expected === null) {
      streak = 1;
      expected = d;
      continue;
    }
    const diff = differenceInCalendarDays(expected, d);
    if (diff === 1) {
      streak++;
      expected = d;
    } else if (diff === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function metWorkoutWeekGoal(
  days: DayRecord[],
  weekStart: string,
  weekEnd: string,
  goal: number
): boolean {
  if (goal <= 0) return false;
  const count = days.filter(
    (d) => d.date >= weekStart && d.date <= weekEnd && d.workedOut
  ).length;
  return count >= goal;
}

/** Consecutive calendar weeks (Mon–Sun) meeting workout-days-per-week goal. */
function countWorkoutWeekStreak(days: DayRecord[], settings: Settings): number {
  const today = todayString();
  const goal = settings.workoutDaysPerWeek;
  let streak = 0;
  const current = weekRangeForOffset(0, today);
  let offset = metWorkoutWeekGoal(days, current.start, current.end, goal)
    ? 0
    : -1;

  for (;;) {
    const { start, end } = weekRangeForOffset(offset, today);
    if (!metWorkoutWeekGoal(days, start, end, goal)) break;
    streak++;
    offset -= 1;
    if (offset < -520) break;
  }

  return streak;
}

/** Prefer `todayRecord` when merging so streaks use the latest today snapshot. */
export function daysForStreaks(
  days: DayRecord[],
  todayRecord?: DayRecord | null
): DayRecord[] {
  const today = todayString();
  const rest = days.filter((d) => d.date !== today);
  if (todayRecord) return [...rest, todayRecord];
  return days;
}

export function computeStreaks(
  days: DayRecord[],
  settings: Settings,
  todayRecord?: DayRecord | null
): Streaks {
  const allDays = daysForStreaks(days, todayRecord);

  return {
    goodDays: countStreak(
      allDays,
      (d) =>
        d.dailyScore === "good" || d.dailyScore === "perfect"
    ),
    workoutWeeks: countWorkoutWeekStreak(allDays, settings),
    loggedDays: countStreak(allDays, isLogged),
    calorieGoalDays: countStreak(allDays, (d) => inCalorieGoal(d, settings)),
    stepsGoalDays: countStreak(allDays, (d) => metStepsGoal(d, settings)),
    waterGoalDays: countStreak(allDays, (d) => waterGoalMet(d.waterMl, settings.dailyWaterGoalMl)),
    teethGoalDays: countStreak(allDays, (d) =>
      teethGoalMet(d.teethBrushings, settings.dailyTeethBrushingsGoal)
    ),
  };
}

/** Streak count color: 0 red, 1–4 yellow, 5–9 green, 10+ purple. */
export function streakValueColorClass(count: number): string {
  if (count <= 0) return "text-red-400";
  if (count <= 4) return "text-yellow-400";
  if (count <= 9) return "text-emerald-400";
  return "text-purple-400";
}
