import { formatWorkoutTemplateSummary } from "./workoutLibrary";
import type { Routine, RoutineExerciseItem } from "../types";

export type RoutineSortField = "name" | "recent";

export type SortDirection = "asc" | "desc";

export interface RoutineSortState {
  field: RoutineSortField;
  direction: SortDirection;
}

export const ROUTINE_SORT_OPTIONS: {
  field: RoutineSortField;
  label: string;
  defaultDirection: SortDirection;
}[] = [
  { field: "name", label: "Alphabetical", defaultDirection: "asc" },
  { field: "recent", label: "Most recent", defaultDirection: "desc" },
];

export const DEFAULT_ROUTINE_SORT: RoutineSortState = {
  field: "name",
  direction: "asc",
};

function createdAtSortKey(createdAt: string | undefined, id: number): string {
  return createdAt?.trim() || String(id).padStart(16, "0");
}

export function routineSortDirectionLabel(
  field: RoutineSortField,
  direction: SortDirection
): string {
  if (field === "name") return direction === "asc" ? "A–Z" : "Z–A";
  return direction === "desc" ? "Newest first" : "Oldest first";
}

export function getRoutineSortOptionLabel(field: RoutineSortField): string {
  return ROUTINE_SORT_OPTIONS.find((o) => o.field === field)?.label ?? field;
}

export function sortRoutines(
  routines: Routine[],
  sort: RoutineSortState
): Routine[] {
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...routines].sort((a, b) => {
    if (sort.field === "recent") {
      const dateDiff = createdAtSortKey(a.createdAt, a.id).localeCompare(
        createdAtSortKey(b.createdAt, b.id)
      );
      if (dateDiff !== 0) return dateDiff * dir;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
    return (
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * dir
    );
  });
}

export function routineTotalCalories(exercises: RoutineExerciseItem[]): number {
  return exercises.reduce((sum, e) => sum + e.calories, 0);
}

export function formatRoutineSummary(routine: Routine): string {
  const count = routine.exercises.length;
  if (count === 0) return "No exercises";
  const total = routineTotalCalories(routine.exercises);
  const calories = total > 0 ? `-${total} kcal` : "—";
  const label = count === 1 ? "1 exercise" : `${count} exercises`;
  return `${label} · ${calories}`;
}

export function formatRoutineExerciseLine(exercise: RoutineExerciseItem): string {
  return formatWorkoutTemplateSummary({
    id: exercise.exerciseId,
    name: exercise.name,
    amount: exercise.amount,
    amountUnit: exercise.amountUnit,
    calories: exercise.calories,
    createdAt: "",
  });
}
