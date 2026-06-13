import { caloriesFromMet } from "./metabolism";
import type { WorkoutEntry, WorkoutIntensity, WorkoutType } from "../types";

export const DEFAULT_WORKOUT_INTENSITY: WorkoutIntensity = "medium";
export const DEFAULT_WORKOUT_TYPE: WorkoutType = "gym";

export const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: "gym", label: "Gym" },
  { value: "run", label: "Run" },
  { value: "cycle", label: "Cycle" },
  { value: "swim", label: "Swim" },
  { value: "yoga", label: "Yoga" },
  { value: "hiit", label: "HIIT" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" },
];

/** MET values by activity type and intensity (Compendium of Physical Activities). */
export const WORKOUT_TYPE_MET: Record<
  WorkoutType,
  Record<WorkoutIntensity, number>
> = {
  gym: { low: 3.5, medium: 5.0, high: 6.0 },
  run: { low: 6.0, medium: 9.8, high: 11.5 },
  cycle: { low: 4.0, medium: 6.8, high: 10.0 },
  swim: { low: 4.8, medium: 7.0, high: 9.8 },
  yoga: { low: 2.3, medium: 3.0, high: 4.0 },
  hiit: { low: 6.0, medium: 8.0, high: 10.0 },
  sports: { low: 4.5, medium: 6.5, high: 8.0 },
  other: { low: 4.0, medium: 6.0, high: 8.0 },
};

export function isWorkoutValid(durationMin: number | null | undefined): boolean {
  return durationMin != null && durationMin > 0;
}

export function inferWorkedOut(
  durationMin: number | null | undefined
): boolean {
  return isWorkoutValid(durationMin);
}

export function inferWorkedOutFromWorkouts(workouts: WorkoutEntry[]): boolean {
  return workouts.some((w) => isWorkoutValid(w.durationMin));
}

export function normalizeWorkoutIntensity(
  intensity: WorkoutIntensity | null | undefined
): WorkoutIntensity {
  if (intensity === "low" || intensity === "medium" || intensity === "high") {
    return intensity;
  }
  return DEFAULT_WORKOUT_INTENSITY;
}

export function normalizeWorkoutType(
  type: WorkoutType | string | null | undefined
): WorkoutType {
  if (
    type === "gym" ||
    type === "run" ||
    type === "cycle" ||
    type === "swim" ||
    type === "yoga" ||
    type === "hiit" ||
    type === "sports" ||
    type === "other"
  ) {
    return type;
  }
  return DEFAULT_WORKOUT_TYPE;
}

export function workoutMet(
  type: WorkoutType | null | undefined,
  intensity: WorkoutIntensity | null | undefined
): number {
  const normalizedType = normalizeWorkoutType(type);
  const normalizedIntensity = normalizeWorkoutIntensity(intensity);
  return WORKOUT_TYPE_MET[normalizedType][normalizedIntensity];
}

/** MET-based estimate for type, duration, and intensity at the given body weight (kg). */
export function estimateWorkoutCalories(
  durationMin: number | null | undefined,
  intensity: WorkoutIntensity | null | undefined,
  weightKg: number,
  workoutType: WorkoutType | null | undefined = DEFAULT_WORKOUT_TYPE
): number | null {
  if (!isWorkoutValid(durationMin) || weightKg <= 0) return null;
  const met = workoutMet(workoutType, intensity);
  return Math.round(caloriesFromMet(met, weightKg, durationMin!));
}

export function resolveWorkoutEntryCalories(
  workout: Pick<
    WorkoutEntry,
    | "workoutType"
    | "durationMin"
    | "intensity"
    | "calories"
    | "caloriesOverride"
  >,
  weightKg: number
): number {
  if (
    workout.caloriesOverride &&
    workout.calories != null &&
    workout.calories >= 0
  ) {
    return Math.round(workout.calories);
  }
  return (
    estimateWorkoutCalories(
      workout.durationMin,
      workout.intensity,
      weightKg,
      workout.workoutType
    ) ?? 0
  );
}

export function resolveTotalWorkoutCalories(
  workouts: WorkoutEntry[],
  weightKg: number
): number {
  return workouts
    .filter((w) => isWorkoutValid(w.durationMin))
    .reduce((sum, w) => sum + resolveWorkoutEntryCalories(w, weightKg), 0);
}

export function totalWorkoutDurationMin(workouts: WorkoutEntry[]): number {
  return workouts
    .filter((w) => isWorkoutValid(w.durationMin))
    .reduce((sum, w) => sum + w.durationMin, 0);
}

export function formatIntensityLabel(
  intensity: WorkoutIntensity | null | undefined
): string | null {
  if (!intensity) return null;
  const normalized = normalizeWorkoutIntensity(intensity);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatWorkoutTypeLabel(
  type: WorkoutType | null | undefined
): string {
  const normalized = normalizeWorkoutType(type);
  return (
    WORKOUT_TYPES.find((t) => t.value === normalized)?.label ??
    normalized.charAt(0).toUpperCase() + normalized.slice(1)
  );
}
