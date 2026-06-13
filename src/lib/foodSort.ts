import type { Food } from "../types";
import { nutrientLabel } from "./nutrients";

export type FoodSortField =
  | "name"
  | "recentlyEaten"
  | "calories"
  | "protein"
  | "carbs"
  | "fat"
  | "fiber"
  | "salt";

export type SortDirection = "asc" | "desc";

export interface FoodSortState {
  field: FoodSortField;
  direction: SortDirection;
}

export const FOOD_SORT_OPTIONS: {
  field: FoodSortField;
  label: string;
  defaultDirection: SortDirection;
}[] = [
  { field: "name", label: "Alphabetical", defaultDirection: "asc" },
  { field: "recentlyEaten", label: "Recently Eaten", defaultDirection: "desc" },
  { field: "calories", label: "Kcal", defaultDirection: "desc" },
  { field: "protein", label: nutrientLabel("protein"), defaultDirection: "desc" },
  { field: "carbs", label: nutrientLabel("carbs"), defaultDirection: "desc" },
  { field: "fat", label: nutrientLabel("fat"), defaultDirection: "desc" },
  { field: "fiber", label: nutrientLabel("fiber"), defaultDirection: "desc" },
  { field: "salt", label: nutrientLabel("salt"), defaultDirection: "desc" },
];

export const DEFAULT_FOOD_SORT: FoodSortState = {
  field: "name",
  direction: "asc",
};

function compareNullableNumber(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: SortDirection
): number {
  const aMissing = a == null;
  const bMissing = b == null;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  const diff = a - b;
  return direction === "asc" ? diff : -diff;
}

export function sortFoods(
  foods: Food[],
  sort: FoodSortState,
  lastEatenByFoodId: Record<number, string>
): Food[] {
  const { field, direction } = sort;
  const dir = direction === "asc" ? 1 : -1;

  return [...foods].sort((a, b) => {
    switch (field) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "recentlyEaten": {
        const aDate = lastEatenByFoodId[a.id];
        const bDate = lastEatenByFoodId[b.id];
        if (!aDate && !bDate) return a.name.localeCompare(b.name);
        if (!aDate) return 1;
        if (!bDate) return -1;
        const dateDiff = aDate.localeCompare(bDate);
        if (dateDiff !== 0) return dir * dateDiff;
        return a.name.localeCompare(b.name);
      }
      case "calories": {
        const diff = a.calories - b.calories;
        if (diff !== 0) return dir * (diff > 0 ? 1 : -1);
        return a.name.localeCompare(b.name);
      }
      case "protein":
      case "carbs":
      case "fat":
      case "fiber":
      case "salt": {
        const cmp = compareNullableNumber(a[field], b[field], direction);
        if (cmp !== 0) return cmp;
        return a.name.localeCompare(b.name);
      }
      default:
        return 0;
    }
  });
}

export function sortDirectionLabel(
  field: FoodSortField,
  direction: SortDirection
): string {
  if (field === "name") {
    return direction === "asc" ? "A–Z" : "Z–A";
  }
  if (field === "recentlyEaten") {
    return direction === "desc" ? "Newest first" : "Oldest first";
  }
  return direction === "desc" ? "High to low" : "Low to high";
}

export function getSortOptionLabel(field: FoodSortField): string {
  return FOOD_SORT_OPTIONS.find((o) => o.field === field)?.label ?? field;
}
