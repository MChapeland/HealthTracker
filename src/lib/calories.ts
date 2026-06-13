import type { Food, FoodEntry, FoodUnit, Settings } from "../types";
import { NUTRIENTS } from "./nutrients";



export function entryCalories(

  food: Pick<Food, "calories" | "referenceQuantity">,

  quantity: number

): number {

  if (food.referenceQuantity <= 0) return 0;

  return (food.calories * quantity) / food.referenceQuantity;

}



export function macroForEntry(

  macroPerRef: number | null | undefined,

  referenceQuantity: number,

  quantity: number

): number | null {

  if (macroPerRef == null) return null;

  if (referenceQuantity <= 0) return null;

  return (macroPerRef * quantity) / referenceQuantity;

}



export type MacroTotals = {

  carbs: number | null;

  fat: number | null;

  protein: number | null;

  fiber: number | null;

  salt: number | null;

};



const MACRO_KEYS = ["carbs", "fat", "protein", "fiber", "salt"] as const;



export function sumEntryMacros(

  entries: FoodEntry[],

  foods: Food[] = []

): MacroTotals {

  const sums = { carbs: 0, fat: 0, protein: 0, fiber: 0, salt: 0 };

  const has = { carbs: false, fat: false, protein: false, fiber: false, salt: false };



  for (const entry of entries) {

    const food = foods.find((f) => f.id === entry.foodId);

    const refQty = food?.referenceQuantity ?? entry.referenceQuantity ?? 0;

    if (refQty <= 0) continue;

    const src = food ?? entry;



    for (const key of MACRO_KEYS) {

      const amount = macroForEntry(src[key], refQty, entry.quantity);

      if (amount != null) {

        sums[key] += amount;

        has[key] = true;

      }

    }

  }



  return {

    carbs: has.carbs ? sums.carbs : null,

    fat: has.fat ? sums.fat : null,

    protein: has.protein ? sums.protein : null,

    fiber: has.fiber ? sums.fiber : null,

    salt: has.salt ? sums.salt : null,

  };

}



export function getServingMacros(

  entry: FoodEntry,

  food?: Pick<

    Food,

    "referenceQuantity" | "protein" | "carbs" | "fat" | "fiber" | "salt"

  > | null

): MacroTotals {

  const refQty = food?.referenceQuantity ?? entry.referenceQuantity ?? 0;

  if (refQty <= 0) {

    return {

      carbs: null,

      fat: null,

      protein: null,

      fiber: null,

      salt: null,

    };

  }



  const src = food ?? entry;

  return {

    carbs: macroForEntry(src.carbs, refQty, entry.quantity),

    fat: macroForEntry(src.fat, refQty, entry.quantity),

    protein: macroForEntry(src.protein, refQty, entry.quantity),

    fiber: macroForEntry(src.fiber, refQty, entry.quantity),

    salt: macroForEntry(src.salt, refQty, entry.quantity),

  };

}



function formatMacroGramsNumber(value: number): string {
  return String(Math.round(value));
}

export function formatMacroGrams(value: number | null): string {
  if (value == null) return "—";
  return `${formatMacroGramsNumber(value)} g`;
}

export type MacroTooltipLine = {
  key: keyof MacroTotals;
  label: string;
  value: string;
  muted: boolean;
};

export function servingMacroTooltipLines(macros: MacroTotals): MacroTooltipLine[] {
  return NUTRIENTS.map(({ key, label }) => {
    const raw = macros[key];
    const muted =
      raw == null || Math.round(raw) === 0;
    return {
      key,
      label,
      value: formatMacroGrams(raw ?? 0),
      muted,
    };
  });
}



export function validateUnit(

  entryUnit: FoodUnit,

  foodUnit: FoodUnit

): string | null {

  if (entryUnit !== foodUnit) {

    return `Unit must match food reference (${foodUnit})`;

  }

  return null;

}



export type CalorieZone = "ideal" | "warning" | "danger" | "under";



export function getCalorieZone(

  calories: number,

  idealMin: number,

  idealMax: number,

  warningBelow: number,

  warning: number,

  max: number

): CalorieZone {

  if (calories >= max) return "danger";

  if (calories > warning) return "danger";

  if (calories > idealMax) return "warning";

  if (calories >= idealMin) return "ideal";

  if (calories >= warningBelow) return "warning";

  return "under";

}

export function calorieZoneTextClass(zone: CalorieZone): string {
  switch (zone) {
    case "ideal":
      return "text-emerald-400";
    case "warning":
      return "text-amber-400";
    case "danger":
    case "under":
      return "text-red-400";
  }
}

const CALORIE_TARGET_MIN_GAP = 50;



export type CalorieTargets = Pick<

  Settings,

  | "calorieIdealMin"

  | "calorieIdealMax"

  | "calorieWarningBelow"

  | "calorieWarning"

  | "calorieMax"

>;

/** Tooltip value color for a calorie total vs user targets. */
export function calorieTooltipValueClass(
  calories: number,
  targets: CalorieTargets | null | undefined
): string {
  if (!targets) return "text-accent";
  return calorieZoneTextClass(
    getCalorieZone(
      calories,
      targets.calorieIdealMin,
      targets.calorieIdealMax,
      targets.calorieWarningBelow,
      targets.calorieWarning,
      targets.calorieMax
    )
  );
}

/** Keeps warn-below < ideal min < ideal max < warning above < max with minimum spacing. */

export function normalizeCalorieTargets(

  targets: CalorieTargets,

  gap = CALORIE_TARGET_MIN_GAP

): CalorieTargets {

  const max = Math.round(targets.calorieMax);

  if (max < 1) {

    return { ...targets, calorieMax: max };

  }



  let warnBelow = Math.round(targets.calorieWarningBelow);

  let idealMin = Math.round(targets.calorieIdealMin);

  let idealMax = Math.round(targets.calorieIdealMax);

  let warning = Math.round(targets.calorieWarning);



  warnBelow = Math.max(0, Math.min(warnBelow, max - gap * 4));

  idealMin = Math.max(warnBelow + gap, Math.min(idealMin, max - gap * 3));

  idealMax = Math.max(idealMin + gap, Math.min(idealMax, max - gap * 2));

  warning = Math.max(idealMax + gap, Math.min(warning, max - gap));



  return {

    calorieMax: max,

    calorieWarningBelow: warnBelow,

    calorieIdealMin: idealMin,

    calorieIdealMax: idealMax,

    calorieWarning: warning,

  };

}



export function calorieTargetPercents(targets: CalorieTargets) {

  const max = targets.calorieMax;

  if (max <= 0) {

    return {

      warnBelowEnd: 0,

      idealStart: 0,

      idealEnd: 0,

      warnEnd: 0,

    };

  }

  return {

    warnBelowEnd: (targets.calorieWarningBelow / max) * 100,

    idealStart: (targets.calorieIdealMin / max) * 100,

    idealEnd: (targets.calorieIdealMax / max) * 100,

    warnEnd: (targets.calorieWarning / max) * 100,

  };

}

/** 50% opacity — same hues as {@link CalorieZoneTrack}. */
export const CALORIE_ZONE_SEGMENT_FILLS = {
  under: "rgba(239, 68, 68, 0.5)",
  warnLow: "rgba(245, 158, 11, 0.5)",
  ideal: "rgba(5, 150, 105, 0.5)",
  warnHigh: "rgba(245, 158, 11, 0.5)",
  danger: "rgba(239, 68, 68, 0.5)",
} as const;

export type CalorieZoneSegment = {
  fromKcal: number;
  toKcal: number;
  fill: string;
};

export function calorieZoneSegments(targets: CalorieTargets): CalorieZoneSegment[] {
  const t = normalizeCalorieTargets(targets);
  return [
    {
      fromKcal: 0,
      toKcal: t.calorieWarningBelow,
      fill: CALORIE_ZONE_SEGMENT_FILLS.under,
    },
    {
      fromKcal: t.calorieWarningBelow,
      toKcal: t.calorieIdealMin,
      fill: CALORIE_ZONE_SEGMENT_FILLS.warnLow,
    },
    {
      fromKcal: t.calorieIdealMin,
      toKcal: t.calorieIdealMax,
      fill: CALORIE_ZONE_SEGMENT_FILLS.ideal,
    },
    {
      fromKcal: t.calorieIdealMax,
      toKcal: t.calorieWarning,
      fill: CALORIE_ZONE_SEGMENT_FILLS.warnHigh,
    },
    {
      fromKcal: t.calorieWarning,
      toKcal: t.calorieMax,
      fill: CALORIE_ZONE_SEGMENT_FILLS.danger,
    },
  ];
}


