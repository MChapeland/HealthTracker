import { invoke } from "@tauri-apps/api/core";
import { parseWeightChangeRateUnit } from "./metabolism";
import { normalizeGeminiModel } from "./geminiModels";
import {
  DEFAULT_SCORE_WEIGHTS,
} from "./scoreWeights";
import type {
  BackupData,
  DayInput,
  DayRecord,
  Food,
  FoodEntry,
  FoodUnit,
  MealEstimate,
  MealEstimateApiLog,
  MetricsPoint,
  PeriodSummary,
  Settings,
  SyncPullResult,
  SyncSnapshot,
  SyncState,
  WorkoutEntry,
  WorkoutTemplate,
  Routine,
  ExerciseProgress,
  ExerciseLogInput,
  RoutineProgress,
  RoutineLogExerciseInput,
} from "../types";

/** Backend row includes unused legacy weight-trend weight (always 0). */
type SettingsRow = Settings & { scoreWeightTrend: number };

function normalizeDayRecord(day: DayRecord): DayRecord {
  return {
    ...day,
    workoutCalories: day.workoutCalories ?? null,
    workoutCaloriesOverride: day.workoutCaloriesOverride ?? false,
  };
}

export const api = {
  getSettings: async (): Promise<Settings> => {
    const { scoreWeightTrend: _, ...settings } =
      await invoke<SettingsRow>("get_settings");
    const merged: Settings = {
      ...settings,
      calorieWarningBelow:
        settings.calorieWarningBelow ??
        Math.max(0, settings.calorieIdealMin - 200),
      scoreWeightCalories:
        settings.scoreWeightCalories ?? DEFAULT_SCORE_WEIGHTS.scoreWeightCalories,
      scoreWeightWalking:
        settings.scoreWeightWalking ?? DEFAULT_SCORE_WEIGHTS.scoreWeightWalking,
      scoreWeightWorkout:
        settings.scoreWeightWorkout ?? DEFAULT_SCORE_WEIGHTS.scoreWeightWorkout,
      scoreWeightFoodKcal: settings.scoreWeightFoodKcal ?? 75,
      scoreWeightFoodMacros: settings.scoreWeightFoodMacros ?? 25,
      targetWeightChangeUnit: parseWeightChangeRateUnit(
        settings.targetWeightChangeUnit
      ),
      workoutDaysPerWeek: Math.min(
        7,
        Math.max(1, settings.workoutDaysPerWeek ?? 3)
      ),
      dailyWaterGoalMl: settings.dailyWaterGoalMl ?? 2000,
      dailyTeethBrushingsGoal: settings.dailyTeethBrushingsGoal ?? 2,
      scoreWeightTeeth:
        settings.scoreWeightTeeth ?? DEFAULT_SCORE_WEIGHTS.scoreWeightTeeth,
      mealEstimateEnabled: settings.mealEstimateEnabled ?? false,
      mealEstimateApiKey: settings.mealEstimateApiKey ?? null,
      mealEstimateModel: normalizeGeminiModel(settings.mealEstimateModel),
    };
    return merged;
  },
  updateSettings: (settings: Settings) =>
    invoke<void>("update_settings", {
      settings: {
        ...settings,
        scoreWeightTrend: 0,
        targetWeightChangeUnit: parseWeightChangeRateUnit(
          settings.targetWeightChangeUnit
        ),
      } satisfies SettingsRow,
    }),

  listFoods: (query?: string) => invoke<Food[]>("list_foods", { query }),
  getFoodLastEatenDates: () =>
    invoke<Record<number, string>>("get_food_last_eaten_dates"),
  createFood: (food: Food) => invoke<Food>("create_food", { food }),
  updateFood: (food: Food) => invoke<Food>("update_food", { food }),
  deleteFood: (id: number) => invoke<void>("delete_food", { id }),

  listWorkoutTemplates: (query?: string) =>
    invoke<WorkoutTemplate[]>("list_workout_templates", { query }),
  createWorkoutTemplate: (template: WorkoutTemplate) =>
    invoke<WorkoutTemplate>("create_workout_template", { template }),
  updateWorkoutTemplate: (template: WorkoutTemplate) =>
    invoke<WorkoutTemplate>("update_workout_template", { template }),
  deleteWorkoutTemplate: (id: number) =>
    invoke<void>("delete_workout_template", { id }),

  listRoutines: (query?: string) =>
    invoke<Routine[]>("list_routines", { query }),
  createRoutine: (name: string, exerciseIds: number[]) =>
    invoke<Routine>("create_routine", { name, exerciseIds }),
  updateRoutine: (id: number, name: string, exerciseIds: number[]) =>
    invoke<Routine>("update_routine", { id, name, exerciseIds }),
  deleteRoutine: (id: number) => invoke<void>("delete_routine", { id }),

  getExerciseProgress: (exerciseId: number) =>
    invoke<ExerciseProgress>("get_exercise_progress", { exerciseId }),
  addExerciseLog: (exerciseId: number, input: ExerciseLogInput) =>
    invoke<ExerciseProgress>("add_exercise_log", { exerciseId, input }),
  deleteExerciseLog: (logId: number) =>
    invoke<void>("delete_exercise_log", { logId }),

  getRoutineProgress: (routineId: number) =>
    invoke<RoutineProgress>("get_routine_progress", { routineId }),
  addRoutineLog: (
    routineId: number,
    dayDate: string,
    entries: RoutineLogExerciseInput[]
  ) =>
    invoke<RoutineProgress>("add_routine_log", {
      routineId,
      dayDate,
      entries,
    }),
  deleteRoutineLog: (logId: number) =>
    invoke<void>("delete_routine_log", { logId }),

  getDay: async (date: string) =>
    normalizeDayRecord(await invoke<DayRecord>("get_day", { date })),
  listDays: async (start: string, end: string) =>
    (await invoke<DayRecord[]>("list_days", { start, end })).map(normalizeDayRecord),
  upsertDay: async (day: DayInput) =>
    normalizeDayRecord(await invoke<DayRecord>("upsert_day", { day })),

  listFoodEntries: (date: string) =>
    invoke<FoodEntry[]>("list_food_entries", { date }),
  addFoodEntry: (
    dayDate: string,
    foodId: number,
    quantity: number,
    unit: FoodUnit,
    calories: number
  ) =>
    invoke<FoodEntry>("add_food_entry", {
      dayDate,
      foodId,
      quantity,
      unit,
      calories,
    }),
  updateFoodEntry: (
    id: number,
    quantity: number,
    unit: FoodUnit,
    calories: number
  ) =>
    invoke<FoodEntry>("update_food_entry", { id, quantity, unit, calories }),
  deleteFoodEntry: (id: number) => invoke<void>("delete_food_entry", { id }),

  estimateMeal: (description: string) =>
    invoke<MealEstimate>("estimate_meal", { description }),
  logEstimatedMeal: (dayDate: string, estimate: MealEstimate) =>
    invoke<FoodEntry>("log_estimated_meal", { dayDate, estimate }),
  listMealEstimateApiLogs: (limit?: number) =>
    invoke<MealEstimateApiLog[]>("list_meal_estimate_api_logs", { limit }),
  clearMealEstimateApiLogs: () =>
    invoke<void>("clear_meal_estimate_api_logs"),

  listWorkouts: (date: string) =>
    invoke<WorkoutEntry[]>("list_workouts", { date }),
  addWorkout: (
    dayDate: string,
    workoutType: WorkoutEntry["workoutType"],
    durationMin: number,
    intensity: WorkoutEntry["intensity"],
    calories: number | null,
    caloriesOverride: boolean
  ) =>
    invoke<WorkoutEntry>("add_workout", {
      dayDate,
      workoutType,
      durationMin,
      intensity,
      calories,
      caloriesOverride,
    }),
  updateWorkout: (
    id: number,
    workoutType: WorkoutEntry["workoutType"],
    durationMin: number,
    intensity: WorkoutEntry["intensity"],
    calories: number | null,
    caloriesOverride: boolean
  ) =>
    invoke<WorkoutEntry>("update_workout", {
      id,
      workoutType,
      durationMin,
      intensity,
      calories,
      caloriesOverride,
    }),
  deleteWorkout: (id: number) => invoke<void>("delete_workout", { id }),

  getMetricsRange: (start: string, end: string) =>
    invoke<MetricsPoint[]>("get_metrics_range", { start, end }),
  getPeriodSummary: (days: number) =>
    invoke<PeriodSummary>("get_period_summary", { days }),
  getLatestWeight: (beforeDate: string) =>
    invoke<number | null>("get_latest_weight", { beforeDate }),
  exportBackup: () => invoke<BackupData>("export_backup"),
  exportSyncSnapshot: () => invoke<SyncSnapshot>("export_sync_snapshot"),
  importBackup: (backup: BackupData) =>
    invoke<void>("import_backup", { backup }),
  importSyncSnapshot: (snapshot: SyncSnapshot) =>
    invoke<void>("import_sync_snapshot", { snapshot }),
  getSyncState: () => invoke<SyncState>("get_sync_state"),
  saveGoogleAuth: (email: string, refreshToken: string) =>
    invoke<void>("save_google_auth", { email, refreshToken }),
  clearGoogleAuth: () => invoke<void>("clear_google_auth"),
  getGoogleRefreshToken: () =>
    invoke<string | null>("get_google_refresh_token"),
  markSynced: (syncedAt: string) =>
    invoke<void>("mark_synced", { syncedAt: syncedAt }),
  syncPush: (accessToken: string) =>
    invoke<SyncSnapshot>("sync_push", { accessToken }),
  syncPull: (accessToken: string) =>
    invoke<SyncPullResult>("sync_pull", { accessToken }),
  readBackupFile: (path: string) => invoke<string>("read_backup_file", { path }),
  writeBackupFile: (path: string, contents: string) =>
    invoke<void>("write_backup_file", { path, contents }),
};
