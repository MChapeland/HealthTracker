import { differenceInYears, isValid, parseISO } from "date-fns";
import { stepsToDuration } from "./walking";
import { todayString } from "./dates";
import { normalizeCalorieTargets, type CalorieTargets } from "./calories";
import {
  DEFAULT_WEIGHT_CHANGE_RATE_MAGNITUDE,
  DEFAULT_WEIGHT_CHANGE_RATE_UNIT,
  type ActivityLevel,
  type DayEnergyBalance,
  type DayRecord,
  type Settings,
  type Sex,
  type WeightChangeRateUnit,
  type WorkoutIntensity,
} from "../types";

/** ~7,700 kcal per kg body fat (common clinical approximation). */
export const KCAL_PER_KG_FAT = 7700;

/** Baseline PAL for daily living (excluding logged walk/workout). */
const BASELINE_PAL = 1.2;

export const ACTIVITY_LEVELS: {
  value: ActivityLevel;
  label: string;
}[] = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Lightly active" },
  { value: "moderate", label: "Moderately active" },
  { value: "active", label: "Very active" },
  { value: "very_active", label: "Extra active" },
];

const WALKING_MET = 3.5;

const WORKOUT_MET: Record<WorkoutIntensity, number> = {
  low: 4,
  medium: 6,
  high: 8,
};

export type DayActivityInput = Pick<
  DayRecord,
  | "steps"
  | "distanceKm"
  | "durationMin"
  | "workedOut"
  | "workoutDurationMin"
  | "workoutIntensity"
  | "workoutCalories"
  | "workoutCaloriesOverride"
>;

export interface MacroGoalsGrams {
  carbs: number;
  fat: number;
  protein: number;
  fiber: number;
  salt: number;
}

/** g protein per kg body weight for default macro split. */
const PROTEIN_G_PER_KG = 1.6;
/** Share of target kcal from fat (remainder goes to carbs after protein). */
const FAT_KCAL_FRACTION = 0.275;
/** g fiber per 1000 kcal (common dietary guideline). */
const FIBER_G_PER_1000_KCAL = 14;
/** Daily salt target (g); aligns with ~5 g/day upper guidance. */
const DEFAULT_SALT_G = 5;

export function calculateDefaultMacroGoals(
  settings: Settings
): { complete: true; goals: MacroGoalsGrams } | { complete: false; missing: string[] } {
  const profile = metabolismProfileComplete(settings);
  const weightKg = resolveWeightForMetabolism(null, settings);
  const missing = [...profile.missing];
  if (weightKg == null) missing.push("starting weight");

  if (missing.length > 0 || weightKg == null) {
    return { complete: false, missing };
  }

  const kg = weightKg;
  const targetKcal = Math.round(
    (settings.calorieIdealMin + settings.calorieIdealMax) / 2
  );

  const protein = Math.round(kg * PROTEIN_G_PER_KG);
  const fat = Math.round((targetKcal * FAT_KCAL_FRACTION) / 9);
  const carbs = Math.max(
    0,
    Math.round((targetKcal - protein * 4 - fat * 9) / 4)
  );
  const fiber = Math.max(
    10,
    Math.round((targetKcal / 1000) * FIBER_G_PER_1000_KCAL)
  );

  return {
    complete: true,
    goals: {
      protein,
      fat,
      carbs,
      fiber,
      salt: DEFAULT_SALT_G,
    },
  };
}

export function macroGoalsToSettings(
  goals: MacroGoalsGrams
): Pick<
  Settings,
  | "macroGoalCarbs"
  | "macroGoalFat"
  | "macroGoalProtein"
  | "macroGoalFiber"
  | "macroGoalSalt"
> {
  return {
    macroGoalCarbs: goals.carbs,
    macroGoalFat: goals.fat,
    macroGoalProtein: goals.protein,
    macroGoalFiber: goals.fiber,
    macroGoalSalt: goals.salt,
  };
}

export function metabolismProfileComplete(settings: Settings): {
  complete: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (settings.heightCm == null || settings.heightCm <= 0) {
    missing.push("height");
  }
  if (ageFromBirthDate(settings.birthDate) == null) {
    missing.push("birthday");
  }
  if (!settings.sex) missing.push("sex");
  return { complete: missing.length === 0, missing };
}

/** Full years between birthday and reference date (defaults to today). */
export function ageFromBirthDate(
  birthDate: string | null | undefined,
  asOfDate: string = todayString()
): number | null {
  if (!birthDate?.trim()) return null;
  const dob = parseISO(birthDate);
  const asOf = parseISO(asOfDate);
  if (!isValid(dob) || !isValid(asOf) || asOf < dob) return null;
  const age = differenceInYears(asOf, dob);
  if (age < 1 || age > 120) return null;
  return age;
}

/** Mifflin–St Jeor (1990), widely used for BMR estimates. */
export function calculateBmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: Sex
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (sex === "male") return base + 5;
  if (sex === "female") return base - 161;
  return (base + 5 + (base - 161)) / 2;
}

/** kcal = MET × kg × hours (ACSM-style estimate). */
export function caloriesFromMet(
  met: number,
  weightKg: number,
  durationMin: number
): number {
  if (durationMin <= 0) return 0;
  return met * weightKg * (durationMin / 60);
}

export function resolveWalkingMinutes(
  activity: DayActivityInput,
  settings: Settings
): number {
  if (activity.steps != null && activity.steps > 0) {
    return stepsToDuration(activity.steps, settings);
  }
  return 0;
}

export function calculateWalkingCalories(
  activity: DayActivityInput,
  settings: Settings,
  weightKg: number
): number {
  const minutes = resolveWalkingMinutes(activity, settings);
  return caloriesFromMet(WALKING_MET, weightKg, minutes);
}

export function calculateWorkoutCalories(
  activity: DayActivityInput,
  weightKg: number
): number {
  const minutes = activity.workoutDurationMin ?? 0;
  if (!activity.workedOut || minutes <= 0) return 0;
  const intensity = activity.workoutIntensity ?? "medium";
  return caloriesFromMet(WORKOUT_MET[intensity], weightKg, minutes);
}

/** User override or MET estimate from duration, intensity, and weight. */
export function resolveWorkoutCalories(
  activity: DayActivityInput,
  weightKg: number
): number {
  if (
    activity.workoutCaloriesOverride &&
    activity.workoutCalories != null &&
    activity.workoutCalories >= 0
  ) {
    return activity.workoutCalories;
  }
  return Math.round(calculateWorkoutCalories(activity, weightKg));
}

/** Map effective PAL (TDEE / BMR) to a familiar activity label. */
export function deriveActivityLevelFromBurn(
  bmr: number,
  totalBurn: number
): ActivityLevel {
  if (bmr <= 0) return "sedentary";
  const pal = totalBurn / bmr;
  if (pal < 1.3) return "sedentary";
  if (pal < 1.45) return "light";
  if (pal < 1.6) return "moderate";
  if (pal < 1.8) return "active";
  return "very_active";
}

export function activityLevelLabel(level: ActivityLevel): string {
  return ACTIVITY_LEVELS.find((a) => a.value === level)?.label ?? level;
}

export function calculateDayBurn(
  bmr: number,
  activity: DayActivityInput,
  settings: Settings,
  weightKg: number
): {
  baselineCalories: number;
  walkingCalories: number;
  workoutCalories: number;
  tdee: number;
  derivedActivityLevel: ActivityLevel;
} {
  const baselineCalories = bmr * BASELINE_PAL;
  const walkingCalories = calculateWalkingCalories(
    activity,
    settings,
    weightKg
  );
  const workoutCalories = resolveWorkoutCalories(activity, weightKg);
  const tdee = baselineCalories + walkingCalories + workoutCalories;
  return {
    baselineCalories,
    walkingCalories,
    workoutCalories,
    tdee,
    derivedActivityLevel: deriveActivityLevelFromBurn(bmr, tdee),
  };
}

export function resolveWeightForMetabolism(
  dayWeight: number | null,
  settings: Settings
): number | null {
  if (dayWeight != null && dayWeight > 0) return dayWeight;
  if (settings.startingWeight != null && settings.startingWeight > 0) {
    return settings.startingWeight;
  }
  return null;
}

const PAL_BY_ACTIVITY: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** When activity level is unset, assume lightly active for maintenance estimates. */
const DEFAULT_MAINTENANCE_PAL = 1.375;

export const AVG_DAYS_PER_MONTH = 30.437;

const WEEKS_PER_MONTH = AVG_DAYS_PER_MONTH / 7;
const MONTHS_PER_YEAR = 12;

export function parseWeightChangeRateUnit(
  value: string | null | undefined
): WeightChangeRateUnit {
  if (value === "day" || value === "week" || value === "month" || value === "year") {
    return value;
  }
  return DEFAULT_WEIGHT_CHANGE_RATE_UNIT;
}

/** Default lose rate: 2 kg/month. */
export function defaultTargetMonthlyWeightChangeKg(): number {
  return -DEFAULT_WEIGHT_CHANGE_RATE_MAGNITUDE;
}

export function signedMonthlyKgFromRate(
  magnitude: number | null,
  unit: WeightChangeRateUnit,
  lose: boolean
): number | null {
  if (magnitude == null || Number.isNaN(magnitude)) return null;
  if (magnitude === 0) return 0;
  const signed = lose ? -magnitude : magnitude;
  switch (unit) {
    case "day":
      return signed * AVG_DAYS_PER_MONTH;
    case "week":
      return signed * WEEKS_PER_MONTH;
    case "month":
      return signed;
    case "year":
      return signed / MONTHS_PER_YEAR;
  }
}

export function displayAmountFromMonthlyKg(
  monthlyKg: number | null | undefined,
  unit: WeightChangeRateUnit
): string {
  if (monthlyKg === 0) return "";
  const effective =
    monthlyKg == null ? defaultTargetMonthlyWeightChangeKg() : monthlyKg;
  const abs = Math.abs(effective);
  let amount: number;
  switch (unit) {
    case "day":
      amount = abs / AVG_DAYS_PER_MONTH;
      break;
    case "week":
      amount = abs / WEEKS_PER_MONTH;
      break;
    case "month":
      amount = abs;
      break;
    case "year":
      amount = abs * MONTHS_PER_YEAR;
      break;
  }
  const rounded = Math.round(amount * 1000) / 1000;
  return String(rounded);
}

function dailyKcalOffsetForMonthlyKg(monthlyKg: number): number {
  return Math.round((monthlyKg * KCAL_PER_KG_FAT) / AVG_DAYS_PER_MONTH);
}

function monthlyKgFromDailyOffset(dailyOffset: number): number {
  return (dailyOffset * AVG_DAYS_PER_MONTH) / KCAL_PER_KG_FAT;
}

const MAINTENANCE_MONTHLY_KG_EPS = 0.05;

export type WeightChangeDirection = "lose" | "gain" | "maintain";

export function weightChangeDirectionFromMonthlyKg(
  monthlyKg: number | null | undefined
): WeightChangeDirection {
  if (monthlyKg != null && Math.abs(monthlyKg) < MAINTENANCE_MONTHLY_KG_EPS) {
    return "maintain";
  }
  if (monthlyKg != null && monthlyKg > 0) return "gain";
  return "lose";
}

/** Common upper bound cited in clinical weight-management guidance (kg/month). */
const MAX_RECOMMENDED_MONTHLY_CHANGE_KG = 4;

/** Advisory only — does not change targets. */
export function weightChangeGoalSafetyWarning(
  settings: Settings,
  monthlyChangeKg: number | null | undefined
): string | null {
  if (monthlyChangeKg === 0) return null;

  const result = calorieTargetsFromMonthlyGoal(monthlyChangeKg, settings);
  if (!result.complete) return null;

  const absMonthly = Math.abs(result.monthlyKg);
  if (absMonthly < MAINTENANCE_MONTHLY_KG_EPS) return null;

  if (absMonthly > MAX_RECOMMENDED_MONTHLY_CHANGE_KG) {
    return "This rate is faster than most guidelines consider safe without medical supervision.";
  }

  return null;
}

/** Infer kg/month from ideal band center vs estimated maintenance (inverse of goal → targets). */
export function monthlyWeightChangeKgFromCalorieTargets(
  settings: Settings,
  targets: CalorieTargets
): { complete: true; monthlyKg: number | null } | { complete: false } {
  const tdee = estimateMaintenanceTdee(settings);
  if (tdee == null) return { complete: false };

  const center = (targets.calorieIdealMin + targets.calorieIdealMax) / 2;
  const monthlyRaw = monthlyKgFromDailyOffset(center - tdee);
  const monthlyRounded = Math.round(monthlyRaw * 10) / 10;

  if (Math.abs(monthlyRounded) < MAINTENANCE_MONTHLY_KG_EPS) {
    return { complete: true, monthlyKg: 0 };
  }
  return { complete: true, monthlyKg: monthlyRounded };
}

export function settingsPatchFromManualCalorieTargets(
  settings: Settings,
  targets: CalorieTargets
): Partial<Settings> {
  const patch: Partial<Settings> = {
    ...targets,
    targetWeightChangeUnit: parseWeightChangeRateUnit(
      settings.targetWeightChangeUnit
    ),
  };

  // Only the ideal band defines the goal intake; zone width markers must not
  // move the weight-change rate (e.g. lowering "warning below" is not eating less).
  const goalBandUnchanged =
    settings.calorieIdealMin === targets.calorieIdealMin &&
    settings.calorieIdealMax === targets.calorieIdealMax;

  if (goalBandUnchanged) {
    return patch;
  }

  const monthly = monthlyWeightChangeKgFromCalorieTargets(settings, targets);
  return {
    ...patch,
    targetMonthlyWeightChangeKg: monthly.complete ? monthly.monthlyKg : null,
  };
}

function monthlyKgForGoal(monthlyChangeKg: number | null | undefined): number {
  if (monthlyChangeKg == null || Number.isNaN(monthlyChangeKg)) {
    return defaultTargetMonthlyWeightChangeKg();
  }
  return monthlyChangeKg;
}

const IDEAL_BAND_HALF_WIDTH = 100;
const WARN_BELOW_GAP = 150;
const WARN_ABOVE_GAP = 200;
const MAX_ABOVE_WARNING = 250;

function snapCalorieTarget(n: number): number {
  return Math.round(n / 50) * 50;
}

/** Estimated daily burn from profile (BMR × activity factor), without day-specific walk/workout. */
export function estimateMaintenanceTdee(settings: Settings): number | null {
  const profile = metabolismProfileComplete(settings);
  const weightKg = resolveWeightForMetabolism(null, settings);
  if (!profile.complete || weightKg == null) return null;

  const ageYears = ageFromBirthDate(settings.birthDate);
  if (
    ageYears == null ||
    settings.heightCm == null ||
    settings.heightCm <= 0 ||
    !settings.sex
  ) {
    return null;
  }

  const bmr = calculateBmr(
    weightKg,
    settings.heightCm,
    ageYears,
    settings.sex
  );
  const pal =
    settings.activityLevel != null
      ? PAL_BY_ACTIVITY[settings.activityLevel]
      : DEFAULT_MAINTENANCE_PAL;
  return Math.round(bmr * pal);
}

export function calorieTargetsFromMonthlyGoal(
  monthlyChangeKg: number | null | undefined,
  settings: Settings
):
  | {
      complete: true;
      targets: CalorieTargets;
      maintenanceTdee: number;
      targetIntake: number;
      monthlyKg: number;
    }
  | { complete: false; missing: string[] } {
  const profile = metabolismProfileComplete(settings);
  const weightKg = resolveWeightForMetabolism(null, settings);
  const missing = [...profile.missing];
  if (weightKg == null) missing.push("starting weight");

  const tdee = estimateMaintenanceTdee(settings);
  if (tdee == null || weightKg == null) {
    return { complete: false, missing };
  }

  const monthlyKg = monthlyKgForGoal(monthlyChangeKg);
  const offset = dailyKcalOffsetForMonthlyKg(monthlyKg);
  const center = snapCalorieTarget(tdee + offset);

  const idealMin = snapCalorieTarget(center - IDEAL_BAND_HALF_WIDTH);
  const idealMax = snapCalorieTarget(center + IDEAL_BAND_HALF_WIDTH);
  const warnBelow = snapCalorieTarget(idealMin - WARN_BELOW_GAP);
  const warning = snapCalorieTarget(idealMax + WARN_ABOVE_GAP);
  const max = snapCalorieTarget(warning + MAX_ABOVE_WARNING);

  return {
    complete: true,
    maintenanceTdee: tdee,
    targetIntake: center,
    monthlyKg,
    targets: normalizeCalorieTargets({
      calorieIdealMin: idealMin,
      calorieIdealMax: idealMax,
      calorieWarningBelow: warnBelow,
      calorieWarning: warning,
      calorieMax: max,
    }),
  };
}

export function calculateDayEnergyBalance(
  settings: Settings,
  caloriesEaten: number,
  dayWeight: number | null,
  activity: DayActivityInput,
  asOfDate: string = todayString()
): DayEnergyBalance {
  const profile = metabolismProfileComplete(settings);
  const weightKg = resolveWeightForMetabolism(dayWeight, settings);

  if (!profile.complete || weightKg == null) {
    return {
      complete: false,
      missingFields: [
        ...profile.missing,
        ...(weightKg == null ? ["weight"] : []),
      ],
      weightKg,
      bmr: null,
      tdee: null,
      baselineCalories: null,
      walkingCalories: null,
      workoutCalories: null,
      derivedActivityLevel: null,
      caloriesEaten,
      deficit: null,
      estimatedKgChange: null,
    };
  }

  const ageYears = ageFromBirthDate(settings.birthDate, asOfDate)!;
  const bmr = calculateBmr(
    weightKg,
    settings.heightCm!,
    ageYears,
    settings.sex!
  );
  const burn = calculateDayBurn(bmr, activity, settings, weightKg);
  const tdee = burn.tdee;
  const deficit = tdee - caloriesEaten;
  const estimatedKgChange = deficit / KCAL_PER_KG_FAT;

  return {
    complete: true,
    missingFields: [],
    weightKg,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    baselineCalories: Math.round(burn.baselineCalories),
    walkingCalories: Math.round(burn.walkingCalories),
    workoutCalories: Math.round(burn.workoutCalories),
    derivedActivityLevel: burn.derivedActivityLevel,
    caloriesEaten,
    deficit: Math.round(deficit),
    estimatedKgChange,
  };
}

export function formatDeficit(deficit: number): string {
  if (deficit > 0) return `-${deficit.toLocaleString()} kcal`;
  if (deficit < 0) return `+${Math.abs(deficit).toLocaleString()} kcal`;
  return "0 kcal";
}

export function formatEstimatedWeightChange(kg: number): string {
  const abs = Math.abs(kg);
  if (abs < 0.05) return "~no change";
  if (kg < 0) {
    return `~${abs.toFixed(2)} kg gain`;
  }
  return `~${abs.toFixed(2)} kg loss`;
}

/** Compact label for tables (positive kg = estimated loss). */
export function formatKgChangeShort(kg: number | null | undefined): string | null {
  if (kg == null) return null;
  const abs = Math.abs(kg);
  if (abs < 0.05) return "~0 kg";
  if (kg > 0) {
    return `−${abs.toFixed(2)} kg`;
  }
  return `+${abs.toFixed(2)} kg`;
}

export function getDayKgChangeLabel(
  settings: Settings,
  day: Pick<
    DayRecord,
    | "date"
    | "totalCalories"
    | "weight"
    | "steps"
    | "distanceKm"
    | "durationMin"
    | "workedOut"
    | "workoutDurationMin"
    | "workoutIntensity"
    | "workoutCalories"
    | "workoutCaloriesOverride"
  >
): string | null {
  if (day.totalCalories <= 0) return null;
  const balance = calculateDayEnergyBalance(
    settings,
    day.totalCalories,
    day.weight,
    day,
    day.date
  );
  if (!balance.complete) return null;
  return formatKgChangeShort(balance.estimatedKgChange);
}
