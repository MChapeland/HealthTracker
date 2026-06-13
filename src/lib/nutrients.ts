export type NutrientKey = "carbs" | "fat" | "protein" | "fiber" | "salt";

export const NUTRIENTS: { key: NutrientKey; label: string; icon: string }[] = [
  { key: "carbs", label: "Carbs", icon: "fa-solid fa-wheat-awn" },
  { key: "fat", label: "Fat", icon: "fa-solid fa-droplet" },
  { key: "protein", label: "Protein", icon: "fa-solid fa-drumstick-bite" },
  { key: "fiber", label: "Fiber", icon: "fa-solid fa-seedling" },
  { key: "salt", label: "Salt", icon: "fa-solid fa-cube" },
];

export function nutrientMeta(key: NutrientKey) {
  const meta = NUTRIENTS.find((n) => n.key === key);
  if (!meta) throw new Error(`Unknown nutrient: ${key}`);
  return meta;
}

export function nutrientLabel(key: NutrientKey): string {
  return nutrientMeta(key).label;
}

export function isNutrientKey(field: string): field is NutrientKey {
  return NUTRIENTS.some((n) => n.key === field);
}
