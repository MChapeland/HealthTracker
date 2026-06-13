import type { WorkoutAmountUnit, WorkoutTemplate } from "../types";

export const WORKOUT_AMOUNT_UNITS: {
  value: WorkoutAmountUnit;
  label: string;
}[] = [
  { value: "reps", label: "reps" },
  { value: "mins", label: "mins" },
  { value: "hrs", label: "hrs" },
  { value: "km", label: "km" },
];

export function normalizeWorkoutAmountUnit(unit: string): WorkoutAmountUnit {
  const lower = unit.trim().toLowerCase();
  if (
    lower === "reps" ||
    lower === "rep" ||
    lower.startsWith("rep")
  ) {
    return "reps";
  }
  if (
    lower === "mins" ||
    lower === "minutes" ||
    lower === "minute" ||
    lower === "min"
  ) {
    return "mins";
  }
  if (
    lower === "hrs" ||
    lower === "hours" ||
    lower === "hour" ||
    lower === "hr"
  ) {
    return "hrs";
  }
  if (lower === "km") return "km";
  const match = WORKOUT_AMOUNT_UNITS.find((u) => u.value === unit);
  return match?.value ?? "reps";
}

export function workoutAmountUnitLabel(unit: string): string {
  return normalizeWorkoutAmountUnit(unit);
}

export type WorkoutTemplateSortField = "name" | "recent" | "calories";

export type SortDirection = "asc" | "desc";

export interface WorkoutTemplateSortState {
  field: WorkoutTemplateSortField;
  direction: SortDirection;
}

export const WORKOUT_TEMPLATE_SORT_OPTIONS: {
  field: WorkoutTemplateSortField;
  label: string;
  defaultDirection: SortDirection;
}[] = [
  { field: "name", label: "Alphabetical", defaultDirection: "asc" },
  { field: "recent", label: "Most recent", defaultDirection: "desc" },
  { field: "calories", label: "Kcal burned", defaultDirection: "desc" },
];

export const DEFAULT_WORKOUT_TEMPLATE_SORT: WorkoutTemplateSortState = {
  field: "name",
  direction: "asc",
};

function createdAtSortKey(createdAt: string | undefined, id: number): string {
  return createdAt?.trim() || String(id).padStart(16, "0");
}

export function workoutTemplateSortDirectionLabel(
  field: WorkoutTemplateSortField,
  direction: SortDirection
): string {
  if (field === "name") return direction === "asc" ? "A–Z" : "Z–A";
  if (field === "recent") {
    return direction === "desc" ? "Newest first" : "Oldest first";
  }
  return direction === "asc" ? "Low–High" : "High–Low";
}

export function getWorkoutTemplateSortOptionLabel(
  field: WorkoutTemplateSortField
): string {
  return (
    WORKOUT_TEMPLATE_SORT_OPTIONS.find((o) => o.field === field)?.label ?? field
  );
}

export function sortWorkoutTemplates(
  templates: WorkoutTemplate[],
  sort: WorkoutTemplateSortState
): WorkoutTemplate[] {
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...templates].sort((a, b) => {
    if (sort.field === "calories") {
      const diff = a.calories - b.calories;
      if (diff !== 0) return diff * dir;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
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

export function formatWorkoutTemplateSummary(t: WorkoutTemplate): string {
  const amount =
    t.amount % 1 === 0 ? String(Math.round(t.amount)) : String(t.amount);
  const calories =
    t.calories > 0 ? `-${t.calories} kcal` : "—";
  return `${calories} / ${amount} ${workoutAmountUnitLabel(t.amountUnit)}`;
}
