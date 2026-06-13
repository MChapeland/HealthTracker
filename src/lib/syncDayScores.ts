import { api } from "./api";
import { resolveDayRating } from "./scoring";
import type { DayInput, DayRecord, Settings } from "../types";

/** Apply current scoring rules for table display (ignores stale DB daily_score). */
export function applyDisplayScores(
  days: DayRecord[],
  settings: Settings
): DayRecord[] {
  return days.map((d) => ({
    ...d,
    dailyScore: resolveDayRating(d, settings) ?? d.dailyScore,
  }));
}

function toDayInput(day: DayRecord, dailyScore: DayRecord["dailyScore"]): DayInput {
  return {
    date: day.date,
    weight: day.weight,
    walkingPrimary: day.walkingPrimary,
    steps: day.steps,
    distanceKm: day.distanceKm,
    durationMin: day.durationMin,
    workedOut: day.workedOut,
    workoutDurationMin: day.workoutDurationMin,
    workoutIntensity: day.workoutIntensity,
    workoutCalories: day.workoutCalories,
    workoutCaloriesOverride: day.workoutCaloriesOverride,
    notes: day.notes,
    dailyScore,
    totalCalories: day.totalCalories,
    waterMl: day.waterMl,
    teethBrushings: day.teethBrushings,
  };
}

/** Persists corrected daily_score when DB still has the old rules. */
export async function syncStaleDayScores(
  days: DayRecord[],
  settings: Settings
): Promise<void> {
  const updates = days.filter((d) => {
    if (!d.exists) return false;
    const rating = resolveDayRating(d, settings);
    return rating !== d.dailyScore;
  });

  await Promise.all(
    updates.map(async (d) => {
      const rating = resolveDayRating(d, settings);
      await api.upsertDay(toDayInput(d, rating));
    })
  );
}
