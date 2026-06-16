export type DayScore = "perfect" | "good" | "okay" | "bad";
export type { AccentColor } from "../lib/accentColor";
import type { AccentColor } from "../lib/accentColor";
export type WorkoutIntensity = "low" | "medium" | "high";
export type WorkoutType =
  | "gym"
  | "run"
  | "cycle"
  | "swim"
  | "yoga"
  | "hiit"
  | "sports"
  | "other";
export type WalkingPrimary = "steps" | "distance_km" | "duration_min";
export type FoodUnit = "g" | "serving";

/** Used for Mifflin–St Jeor BMR. */
export type Sex = "male" | "female" | "other";

/** PAL multipliers on BMR (FAO/WHO style categories). */
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type WeightChangeRateUnit = "day" | "week" | "month" | "year";

export const DEFAULT_WEIGHT_CHANGE_RATE_UNIT: WeightChangeRateUnit = "month";

/** Default magnitude shown in the weight change rate field (kg/month, lose). */
export const DEFAULT_WEIGHT_CHANGE_RATE_MAGNITUDE = 2;

export const WEIGHT_CHANGE_RATE_UNITS: {
  value: WeightChangeRateUnit;
  label: string;
}[] = [
  { value: "month", label: "kg/month" },
  { value: "day", label: "kg/day" },
  { value: "week", label: "kg/week" },
  { value: "year", label: "kg/year" },
];

export interface Settings {
  startingWeight: number | null;
  targetWeight: number | null;
  /** Canonical kg/month; negative = loss, positive = gain; 0 = maintain; null = default rate */
  targetMonthlyWeightChangeKg: number | null;
  /** Display unit for the goal amount field */
  targetWeightChangeUnit: WeightChangeRateUnit;
  stepLengthM: number;
  speedKmh: number;
  stepsPerKm: number | null;
  dailyStepsGoal: number;
  /** Daily water intake target in milliliters. */
  dailyWaterGoalMl: number;
  /** Target number of teeth brushings per day. */
  dailyTeethBrushingsGoal: number;
  /** Target number of distinct days per week with at least one workout logged. */
  workoutDaysPerWeek: number;
  calorieIdealMin: number;
  calorieIdealMax: number;
  /** Below ideal min: amber warning band down to this value; under = danger */
  calorieWarningBelow: number;
  calorieWarning: number;
  calorieMax: number;
  scoreWeightCalories: number;
  scoreWeightWalking: number;
  scoreWeightWorkout: number;
  scoreWeightTeeth: number;
  scoreGoodThreshold: number;
  scoreOkayThreshold: number;
  onboardingComplete: boolean;
  journeyStartDate: string | null;
  /** Metabolism profile for TDEE / deficit estimates */
  heightCm: number | null;
  /** ISO date (yyyy-MM-dd); age is derived for BMR */
  birthDate: string | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  macroGoalCarbs: number | null;
  macroGoalFat: number | null;
  macroGoalProtein: number | null;
  macroGoalFiber: number | null;
  macroGoalSalt: number | null;
  scoreWeightFoodKcal: number;
  scoreWeightFoodMacros: number;
  accentColor: AccentColor;
  /** Master toggle for AI features. */
  aiEnabled: boolean;
  /** Shared Gemini API key. */
  aiApiKey: string | null;
  /** Shared Gemini model id. */
  aiModel: string;
  /** Enable AI meal calorie estimation. */
  mealEstimateEnabled: boolean;
  /** Enable AI progress feedback. */
  aiFeedbackEnabled: boolean;
  /** Store full prompts/responses in API logs (debug). */
  aiVerboseLogging: boolean;
}

export type AiFeedbackTopic =
  | "generalOverview"
  | "consistency"
  | "weightTrend"
  | "nutrition"
  | "activity"
  | "workouts"
  | "hydration"
  | "dentalHabits"
  | "custom";

export type AiFeedbackConfidence = "high" | "medium" | "low";

export type DataSufficiency = "sufficient" | "insufficient";

export interface SlimDayLog {
  date: string;
  weight: number | null;
  totalCalories: number;
  steps: number | null;
  workedOut: boolean;
  workoutDurationMin: number | null;
  waterMl: number | null;
  teethBrushings: number | null;
}

export interface ProgressFeedbackRequest {
  topic: AiFeedbackTopic;
  userNote?: string;
  analysisPeriodDays: number;
  generatedAt: string;
  userContext: {
    startingWeight: number | null;
    targetWeight: number | null;
    targetMonthlyWeightChangeKg: number | null;
    dailyStepsGoal: number;
    dailyWaterGoalMl: number;
    dailyTeethBrushingsGoal: number;
    workoutDaysPerWeek: number;
    calorieIdealMin: number;
    calorieIdealMax: number;
    journeyStartDate: string | null;
  };
  computed: {
    localStatus: string;
    localStatusReason: string;
    confidence: AiFeedbackConfidence;
    confidenceReason: string;
    metrics: Record<string, number | string | boolean | null>;
    warnings: string[];
  };
  recentLogs: SlimDayLog[];
}

export interface ProgressFeedbackResponse {
  headline: string;
  status: string;
  summary: string;
  likelyExplanation: string;
  positiveSignals: string[];
  watchOuts: string[];
  nextSteps: string[];
  confidence: AiFeedbackConfidence;
  confidenceReason: string;
  debugPayload?: ProgressFeedbackRequest;
}

export interface ProgressAnalysisResult {
  sufficiency: DataSufficiency;
  localStatus: string;
  localStatusReason: string;
  confidence: AiFeedbackConfidence;
  confidenceReason: string;
  metrics: Record<string, number | string | boolean | null>;
  warnings: string[];
  recentLogs: SlimDayLog[];
  emptyMessage?: string;
}

export type AiApiLogFeature = "meal_estimate" | "progress_feedback";

export interface AiApiLog {
  id: number;
  createdAt: string;
  feature: AiApiLogFeature;
  topic: AiFeedbackTopic | null;
  model: string;
  status: "success" | "error";
  errorCode: string | null;
  durationMs: number;
  httpStatus: number | null;
  promptTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  requestPrompt: string | null;
  responseText: string | null;
}

export type MealEstimateConfidence = "low" | "medium" | "high";

export interface MealEstimate {
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  salt: number | null;
  confidence: MealEstimateConfidence;
  notes: string;
}

export type MealEstimateApiLogStatus = "success" | "error";
export type MealEstimateApiLogPromptKind = "estimate" | "repair";

export interface MealEstimateApiLog {
  id: number;
  createdAt: string;
  description: string;
  model: string;
  promptKind: MealEstimateApiLogPromptKind;
  requestPrompt: string;
  responseText: string | null;
  status: MealEstimateApiLogStatus;
  errorMessage: string | null;
  httpStatus: number | null;
  promptTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  durationMs: number;
}

export interface Food {
  id: number;
  name: string;
  referenceQuantity: number;
  referenceUnit: FoodUnit;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  salt?: number | null;
  micronutrients?: string | null;
}

export interface FoodEntry {
  id: number;
  dayDate: string;
  foodId: number;
  foodName: string;
  quantity: number;
  unit: FoodUnit;
  calories: number;
  /** From linked food; used to scale per-serving macros */
  referenceQuantity?: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  salt?: number | null;
}

export type WorkoutAmountUnit = "reps" | "mins" | "hrs" | "km";

export interface WorkoutTemplate {
  id: number;
  name: string;
  amount: number;
  amountUnit: WorkoutAmountUnit;
  calories: number;
  createdAt: string;
}

/** @deprecated Use WorkoutTemplate — exercises in the library share this shape. */
export type ExerciseTemplate = WorkoutTemplate;

export interface RoutineExerciseItem {
  id: number;
  exerciseId: number;
  name: string;
  amount: number;
  amountUnit: WorkoutAmountUnit;
  calories: number;
  sortOrder: number;
}

export interface Routine {
  id: number;
  name: string;
  createdAt: string;
  exercises: RoutineExerciseItem[];
}

export interface ExerciseLogSet {
  id: number;
  sortOrder: number;
  amount: number;
  weightKg: number | null;
}

export interface ExerciseLog {
  id: number;
  exerciseId: number;
  dayDate: string;
  amountUnit: WorkoutAmountUnit;
  calories: number | null;
  createdAt: string;
  sets: ExerciseLogSet[];
}

export interface ExerciseLogSetInput {
  amount: number;
  weightKg: number | null;
}

export interface ExerciseLogInput {
  dayDate: string;
  calories: number | null;
  sets: ExerciseLogSetInput[];
}

export interface ExerciseProgress {
  exercise: WorkoutTemplate;
  logs: ExerciseLog[];
}

export interface RoutineLogEntry {
  id: number;
  exerciseId: number;
  name: string;
  amount: number;
  amountUnit: WorkoutAmountUnit;
  calories: number | null;
  weightKg: number | null;
  sortOrder: number;
}

export interface RoutineLogSession {
  id: number;
  routineId: number;
  dayDate: string;
  createdAt: string;
  entries: RoutineLogEntry[];
  totalCalories: number;
}

export interface RoutineProgress {
  routine: Routine;
  sessions: RoutineLogSession[];
}

export interface RoutineLogExerciseInput {
  exerciseId: number;
  amount: number;
  calories: number | null;
  weightKg: number | null;
}

export interface WorkoutEntry {
  id: number;
  dayDate: string;
  workoutType: WorkoutType;
  durationMin: number;
  intensity: WorkoutIntensity;
  calories: number | null;
  caloriesOverride: boolean;
}

export interface DayRecord {
  date: string;
  weight: number | null;
  walkingPrimary: WalkingPrimary | null;
  steps: number | null;
  distanceKm: number | null;
  durationMin: number | null;
  workedOut: boolean;
  workoutDurationMin: number | null;
  workoutIntensity: WorkoutIntensity | null;
  workoutCalories: number | null;
  workoutCaloriesOverride: boolean;
  notes: string | null;
  dailyScore: DayScore | null;
  totalCalories: number;
  totalCarbs: number | null;
  totalFat: number | null;
  totalProtein: number | null;
  totalFiber: number | null;
  totalSalt: number | null;
  waterMl: number | null;
  teethBrushings: number | null;
  exists: boolean;
}

export interface DayInput {
  date: string;
  weight: number | null;
  walkingPrimary: WalkingPrimary | null;
  steps: number | null;
  distanceKm: number | null;
  durationMin: number | null;
  workedOut: boolean;
  workoutDurationMin: number | null;
  workoutIntensity: WorkoutIntensity | null;
  workoutCalories: number | null;
  workoutCaloriesOverride: boolean;
  notes: string | null;
  dailyScore: DayScore | null;
  totalCalories: number;
  waterMl: number | null;
  teethBrushings: number | null;
}

export interface MetricsPoint {
  date: string;
  weight: number | null;
  totalCalories: number;
  steps: number | null;
  distanceKm: number | null;
  durationMin: number | null;
  workedOut: boolean;
  workoutDurationMin: number | null;
  workoutIntensity: WorkoutIntensity | null;
  workoutCalories: number | null;
  workoutCaloriesOverride: boolean;
  dailyScore: DayScore | null;
  waterMl: number | null;
  teethBrushings: number | null;
}

export interface PeriodSummary {
  daysLogged: number;
  avgCalories: number | null;
  workoutCount: number;
  goodDayPercent: number | null;
  avgSteps: number | null;
  avgWaterMl: number | null;
  totalCalories: number | null;
  weightLogDays: number;
  avgDistanceKm: number | null;
  okayDayPercent: number | null;
  /** First logged weight in period minus last (kg); positive = lost. */
  weightLostKg: number | null;
}

export interface Streaks {
  goodDays: number;
  workoutWeeks: number;
  loggedDays: number;
  calorieGoalDays: number;
  stepsGoalDays: number;
  waterGoalDays: number;
  teethGoalDays: number;
}

export interface BackupData {
  settings: Settings;
  foods: Food[];
  workoutTemplates?: WorkoutTemplate[];
  routines?: Routine[];
  days: DayRecord[];
  foodEntries: FoodEntry[];
  dayWorkouts?: WorkoutEntry[];
  exerciseLogs?: ExerciseLog[];
  routineLogSessions?: RoutineLogSession[];
}

export interface SyncSnapshot {
  schemaVersion: number;
  exportedAt: string;
  deviceId: string;
  data: BackupData;
}

export interface SyncState {
  googleAccountEmail: string | null;
  deviceId: string;
  lastSyncedAt: string | null;
  localModifiedAt: string | null;
}

export interface SyncPullResult {
  found: boolean;
  snapshot?: SyncSnapshot | null;
  remoteModifiedTime?: string | null;
}

export interface DayEnergyBalance {
  complete: boolean;
  missingFields: string[];
  weightKg: number | null;
  bmr: number | null;
  tdee: number | null;
  baselineCalories: number | null;
  walkingCalories: number | null;
  workoutCalories: number | null;
  /** Derived from that day's walk + workout burn vs BMR */
  derivedActivityLevel: ActivityLevel | null;
  caloriesEaten: number;
  /** TDEE minus eaten; positive = deficit (energy out > in) */
  deficit: number | null;
  /** Approx. fat-mass change from deficit (kg); negative = gain */
  estimatedKgChange: number | null;
}
