import type { MealEstimate } from "../types";

export const INVALID_MEAL_DESCRIPTION = "invalid_meal_description";

export function isInvalidMealDescriptionError(error: unknown): boolean {
  return String(error) === INVALID_MEAL_DESCRIPTION;
}

export function isInvalidMealEstimate(estimate: MealEstimate): boolean {
  return estimate.confidence === "low";
}
