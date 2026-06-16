import { backend } from "./backend";
import type { SettingsRow } from "./backend";
import { parseWeightChangeRateUnit } from "./metabolism";
import { normalizeGeminiModel } from "./geminiModels";
import { DEFAULT_SCORE_WEIGHTS } from "./scoreWeights";
import type {
  BackupData,
  DayInput,
  DayRecord,
  Food,
  FoodUnit,
  MealEstimate,
  ProgressFeedbackRequest,
  Settings,
  SyncPullResult,
  SyncSnapshot,
  SyncState,
  WorkoutEntry,
  WorkoutTemplate,
  ExerciseLogInput,
  RoutineLogExerciseInput,
} from "../types";

function normalizeDayRecord(day: DayRecord): DayRecord {
  return {
    ...day,
    workoutCalories: day.workoutCalories ?? null,
    workoutCaloriesOverride: day.workoutCaloriesOverride ?? false,
  };
}

/**
 * Stable public frontend API. Transport (Tauri vs HTTP) is chosen by the
 * selected backend; this module owns frontend-specific normalization so pages
 * and hooks keep importing `api` unchanged.
 */
export const api = {
  getSettings: async (): Promise<Settings> => {
    const { scoreWeightTrend: _, ...settings } = await backend.getSettings();
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
      aiEnabled: settings.aiEnabled ?? settings.mealEstimateEnabled ?? false,
      aiApiKey: settings.aiApiKey ?? settings.mealEstimateApiKey ?? null,
      aiModel: normalizeGeminiModel(
        settings.aiModel ?? settings.mealEstimateModel ?? "gemini-2.5-flash"
      ),
      mealEstimateEnabled: settings.mealEstimateEnabled ?? false,
      aiFeedbackEnabled: settings.aiFeedbackEnabled ?? false,
      aiVerboseLogging: settings.aiVerboseLogging ?? false,
    };
    return merged;
  },
  updateSettings: (settings: Settings) =>
    backend.updateSettings({
      ...settings,
      scoreWeightTrend: 0,
      targetWeightChangeUnit: parseWeightChangeRateUnit(
        settings.targetWeightChangeUnit
      ),
    } satisfies SettingsRow),

  listFoods: (query?: string) => backend.listFoods(query),
  getFoodLastEatenDates: () => backend.getFoodLastEatenDates(),
  createFood: (food: Food) => backend.createFood(food),
  updateFood: (food: Food) => backend.updateFood(food),
  deleteFood: (id: number) => backend.deleteFood(id),

  listWorkoutTemplates: (query?: string) =>
    backend.listWorkoutTemplates(query),
  createWorkoutTemplate: (template: WorkoutTemplate) =>
    backend.createWorkoutTemplate(template),
  updateWorkoutTemplate: (template: WorkoutTemplate) =>
    backend.updateWorkoutTemplate(template),
  deleteWorkoutTemplate: (id: number) => backend.deleteWorkoutTemplate(id),

  listRoutines: (query?: string) => backend.listRoutines(query),
  createRoutine: (name: string, exerciseIds: number[]) =>
    backend.createRoutine(name, exerciseIds),
  updateRoutine: (id: number, name: string, exerciseIds: number[]) =>
    backend.updateRoutine(id, name, exerciseIds),
  deleteRoutine: (id: number) => backend.deleteRoutine(id),

  getExerciseProgress: (exerciseId: number) =>
    backend.getExerciseProgress(exerciseId),
  addExerciseLog: (exerciseId: number, input: ExerciseLogInput) =>
    backend.addExerciseLog(exerciseId, input),
  deleteExerciseLog: (logId: number) => backend.deleteExerciseLog(logId),

  getRoutineProgress: (routineId: number) =>
    backend.getRoutineProgress(routineId),
  addRoutineLog: (
    routineId: number,
    dayDate: string,
    entries: RoutineLogExerciseInput[]
  ) => backend.addRoutineLog(routineId, dayDate, entries),
  deleteRoutineLog: (logId: number) => backend.deleteRoutineLog(logId),

  getDay: async (date: string) =>
    normalizeDayRecord(await backend.getDay(date)),
  listDays: async (start: string, end: string) =>
    (await backend.listDays(start, end)).map(normalizeDayRecord),
  upsertDay: async (day: DayInput) =>
    normalizeDayRecord(await backend.upsertDay(day)),

  listFoodEntries: (date: string) => backend.listFoodEntries(date),
  addFoodEntry: (
    dayDate: string,
    foodId: number,
    quantity: number,
    unit: FoodUnit,
    calories: number
  ) => backend.addFoodEntry(dayDate, foodId, quantity, unit, calories),
  updateFoodEntry: (
    id: number,
    quantity: number,
    unit: FoodUnit,
    calories: number
  ) => backend.updateFoodEntry(id, quantity, unit, calories),
  deleteFoodEntry: (id: number) => backend.deleteFoodEntry(id),

  estimateMeal: (description: string) => backend.estimateMeal(description),
  logEstimatedMeal: (dayDate: string, estimate: MealEstimate) =>
    backend.logEstimatedMeal(dayDate, estimate),
  listMealEstimateApiLogs: (limit?: number) =>
    backend.listMealEstimateApiLogs(limit),
  clearMealEstimateApiLogs: () => backend.clearMealEstimateApiLogs(),

  generateProgressFeedback: (request: ProgressFeedbackRequest) =>
    backend.generateProgressFeedback(request),

  listWorkouts: (date: string) => backend.listWorkouts(date),
  addWorkout: (
    dayDate: string,
    workoutType: WorkoutEntry["workoutType"],
    durationMin: number,
    intensity: WorkoutEntry["intensity"],
    calories: number | null,
    caloriesOverride: boolean
  ) =>
    backend.addWorkout(
      dayDate,
      workoutType,
      durationMin,
      intensity,
      calories,
      caloriesOverride
    ),
  updateWorkout: (
    id: number,
    workoutType: WorkoutEntry["workoutType"],
    durationMin: number,
    intensity: WorkoutEntry["intensity"],
    calories: number | null,
    caloriesOverride: boolean
  ) =>
    backend.updateWorkout(
      id,
      workoutType,
      durationMin,
      intensity,
      calories,
      caloriesOverride
    ),
  deleteWorkout: (id: number) => backend.deleteWorkout(id),

  getMetricsRange: (start: string, end: string) =>
    backend.getMetricsRange(start, end),
  getPeriodSummary: (days: number) => backend.getPeriodSummary(days),
  getLatestWeight: (beforeDate: string) => backend.getLatestWeight(beforeDate),
  exportBackup: (): Promise<BackupData> => backend.exportBackup(),
  exportSyncSnapshot: (): Promise<SyncSnapshot> => backend.exportSyncSnapshot(),
  importBackup: (backup: BackupData) => backend.importBackup(backup),
  importSyncSnapshot: (snapshot: SyncSnapshot) =>
    backend.importSyncSnapshot(snapshot),
  getSyncState: (): Promise<SyncState> => backend.getSyncState(),
  saveGoogleAuth: (email: string, refreshToken: string) =>
    backend.saveGoogleAuth(email, refreshToken),
  clearGoogleAuth: () => backend.clearGoogleAuth(),
  getGoogleRefreshToken: () => backend.getGoogleRefreshToken(),
  markSynced: (syncedAt: string) => backend.markSynced(syncedAt),
  syncPush: (accessToken: string): Promise<SyncSnapshot> =>
    backend.syncPush(accessToken),
  syncPull: (accessToken: string): Promise<SyncPullResult> =>
    backend.syncPull(accessToken),
  readBackupFile: (path: string) => backend.readBackupFile(path),
  writeBackupFile: (path: string, contents: string) =>
    backend.writeBackupFile(path, contents),
};
