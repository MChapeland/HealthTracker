import type { Food, FoodEntry, FoodUnit } from "../types";

export function formatUnitLabel(quantity: number, unit: FoodUnit): string {
  if (unit === "serving") {
    return quantity === 1 ? "serving" : "servings";
  }
  return unit;
}

/** e.g. 150 g, 2 servings */
export function formatQuantityUnit(quantity: number, unit: FoodUnit): string {
  return `${quantity} ${formatUnitLabel(quantity, unit)}`;
}

/** e.g. Pasta (150 g) */
export function formatFoodServing(
  name: string,
  quantity: number,
  unit: FoodUnit
): string {
  return `${name} (${formatQuantityUnit(quantity, unit)})`;
}

/** Synthetic entry for a food's reference serving (library tooltips). */
export function foodReferenceEntry(food: Food): FoodEntry {
  return {
    id: 0,
    dayDate: "",
    foodId: food.id,
    foodName: food.name,
    quantity: food.referenceQuantity,
    unit: food.referenceUnit,
    calories: food.calories,
    referenceQuantity: food.referenceQuantity,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber,
    salt: food.salt,
  };
}
