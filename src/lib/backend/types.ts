import type {
  BackupData,
  DayInput,
  DayRecord,
  ExerciseLogInput,
  ExerciseProgress,
  Food,
  FoodEntry,
  FoodUnit,
  MealEstimate,
  MealEstimateApiLog,
  MetricsPoint,
  PeriodSummary,
  ProgressFeedbackRequest,
  ProgressFeedbackResponse,
  Routine,
  RoutineLogExerciseInput,
  RoutineProgress,
  Settings,
  SyncPullResult,
  SyncSnapshot,
  SyncState,
  WorkoutEntry,
  WorkoutTemplate,
} from "../../types";

/**
 * Raw settings row as stored/returned by the backend. Includes the unused
 * legacy weight-trend weight (always 0) and legacy meal-estimate aliases.
 * The frontend public API (`src/lib/api.ts`) normalizes this into `Settings`.
 */
export type SettingsRow = Settings & {
  scoreWeightTrend: number;
  mealEstimateApiKey?: string | null;
  mealEstimateModel?: string;
};

/**
 * Transport primitive shared by every backend implementation. `command`
 * matches the backend command/endpoint name (snake_case); `args` is the
 * argument object (camelCase keys), serialized as JSON for HTTP or passed to
 * Tauri `invoke`.
 */
export type BackendCall = <T>(
  command: string,
  args?: Record<string, unknown>
) => Promise<T>;

/**
 * Low-level backend surface. One method per backend command, returning the
 * raw backend shapes. Frontend-specific normalization lives in
 * `src/lib/api.ts`, not here, so both transports stay identical.
 */
export interface HealthTrackerBackend {
  getSettings(): Promise<SettingsRow>;
  updateSettings(settings: SettingsRow): Promise<void>;

  listFoods(query?: string): Promise<Food[]>;
  getFoodLastEatenDates(): Promise<Record<number, string>>;
  createFood(food: Food): Promise<Food>;
  updateFood(food: Food): Promise<Food>;
  deleteFood(id: number): Promise<void>;

  listWorkoutTemplates(query?: string): Promise<WorkoutTemplate[]>;
  createWorkoutTemplate(template: WorkoutTemplate): Promise<WorkoutTemplate>;
  updateWorkoutTemplate(template: WorkoutTemplate): Promise<WorkoutTemplate>;
  deleteWorkoutTemplate(id: number): Promise<void>;

  listRoutines(query?: string): Promise<Routine[]>;
  createRoutine(name: string, exerciseIds: number[]): Promise<Routine>;
  updateRoutine(
    id: number,
    name: string,
    exerciseIds: number[]
  ): Promise<Routine>;
  deleteRoutine(id: number): Promise<void>;

  getExerciseProgress(exerciseId: number): Promise<ExerciseProgress>;
  addExerciseLog(
    exerciseId: number,
    input: ExerciseLogInput
  ): Promise<ExerciseProgress>;
  deleteExerciseLog(logId: number): Promise<void>;

  getRoutineProgress(routineId: number): Promise<RoutineProgress>;
  addRoutineLog(
    routineId: number,
    dayDate: string,
    entries: RoutineLogExerciseInput[]
  ): Promise<RoutineProgress>;
  deleteRoutineLog(logId: number): Promise<void>;

  getDay(date: string): Promise<DayRecord>;
  listDays(start: string, end: string): Promise<DayRecord[]>;
  upsertDay(day: DayInput): Promise<DayRecord>;

  listFoodEntries(date: string): Promise<FoodEntry[]>;
  addFoodEntry(
    dayDate: string,
    foodId: number,
    quantity: number,
    unit: FoodUnit,
    calories: number
  ): Promise<FoodEntry>;
  updateFoodEntry(
    id: number,
    quantity: number,
    unit: FoodUnit,
    calories: number
  ): Promise<FoodEntry>;
  deleteFoodEntry(id: number): Promise<void>;

  estimateMeal(description: string): Promise<MealEstimate>;
  logEstimatedMeal(dayDate: string, estimate: MealEstimate): Promise<FoodEntry>;
  listMealEstimateApiLogs(limit?: number): Promise<MealEstimateApiLog[]>;
  clearMealEstimateApiLogs(): Promise<void>;

  generateProgressFeedback(
    request: ProgressFeedbackRequest
  ): Promise<ProgressFeedbackResponse>;

  listWorkouts(date: string): Promise<WorkoutEntry[]>;
  addWorkout(
    dayDate: string,
    workoutType: WorkoutEntry["workoutType"],
    durationMin: number,
    intensity: WorkoutEntry["intensity"],
    calories: number | null,
    caloriesOverride: boolean
  ): Promise<WorkoutEntry>;
  updateWorkout(
    id: number,
    workoutType: WorkoutEntry["workoutType"],
    durationMin: number,
    intensity: WorkoutEntry["intensity"],
    calories: number | null,
    caloriesOverride: boolean
  ): Promise<WorkoutEntry>;
  deleteWorkout(id: number): Promise<void>;

  getMetricsRange(start: string, end: string): Promise<MetricsPoint[]>;
  getPeriodSummary(days: number): Promise<PeriodSummary>;
  getLatestWeight(beforeDate: string): Promise<number | null>;

  exportBackup(): Promise<BackupData>;
  exportSyncSnapshot(): Promise<SyncSnapshot>;
  importBackup(backup: BackupData): Promise<void>;
  importSyncSnapshot(snapshot: SyncSnapshot): Promise<void>;
  getSyncState(): Promise<SyncState>;
  saveGoogleAuth(email: string, refreshToken: string): Promise<void>;
  clearGoogleAuth(): Promise<void>;
  getGoogleRefreshToken(): Promise<string | null>;
  markSynced(syncedAt: string): Promise<void>;
  syncPush(accessToken: string): Promise<SyncSnapshot>;
  syncPull(accessToken: string): Promise<SyncPullResult>;
  readBackupFile(path: string): Promise<string>;
  writeBackupFile(path: string, contents: string): Promise<void>;
}

/**
 * Builds a `HealthTrackerBackend` from a single transport primitive. The Tauri
 * and HTTP backends provide their own `call` and reuse these identical typed
 * wrappers, guaranteeing both transports stay in sync.
 */
export function makeBackend(call: BackendCall): HealthTrackerBackend {
  return {
    getSettings: () => call("get_settings"),
    updateSettings: (settings) => call("update_settings", { settings }),

    listFoods: (query) => call("list_foods", { query }),
    getFoodLastEatenDates: () => call("get_food_last_eaten_dates"),
    createFood: (food) => call("create_food", { food }),
    updateFood: (food) => call("update_food", { food }),
    deleteFood: (id) => call("delete_food", { id }),

    listWorkoutTemplates: (query) =>
      call("list_workout_templates", { query }),
    createWorkoutTemplate: (template) =>
      call("create_workout_template", { template }),
    updateWorkoutTemplate: (template) =>
      call("update_workout_template", { template }),
    deleteWorkoutTemplate: (id) => call("delete_workout_template", { id }),

    listRoutines: (query) => call("list_routines", { query }),
    createRoutine: (name, exerciseIds) =>
      call("create_routine", { name, exerciseIds }),
    updateRoutine: (id, name, exerciseIds) =>
      call("update_routine", { id, name, exerciseIds }),
    deleteRoutine: (id) => call("delete_routine", { id }),

    getExerciseProgress: (exerciseId) =>
      call("get_exercise_progress", { exerciseId }),
    addExerciseLog: (exerciseId, input) =>
      call("add_exercise_log", { exerciseId, input }),
    deleteExerciseLog: (logId) => call("delete_exercise_log", { logId }),

    getRoutineProgress: (routineId) =>
      call("get_routine_progress", { routineId }),
    addRoutineLog: (routineId, dayDate, entries) =>
      call("add_routine_log", { routineId, dayDate, entries }),
    deleteRoutineLog: (logId) => call("delete_routine_log", { logId }),

    getDay: (date) => call("get_day", { date }),
    listDays: (start, end) => call("list_days", { start, end }),
    upsertDay: (day) => call("upsert_day", { day }),

    listFoodEntries: (date) => call("list_food_entries", { date }),
    addFoodEntry: (dayDate, foodId, quantity, unit, calories) =>
      call("add_food_entry", { dayDate, foodId, quantity, unit, calories }),
    updateFoodEntry: (id, quantity, unit, calories) =>
      call("update_food_entry", { id, quantity, unit, calories }),
    deleteFoodEntry: (id) => call("delete_food_entry", { id }),

    estimateMeal: (description) => call("estimate_meal", { description }),
    logEstimatedMeal: (dayDate, estimate) =>
      call("log_estimated_meal", { dayDate, estimate }),
    listMealEstimateApiLogs: (limit) =>
      call("list_meal_estimate_api_logs", { limit }),
    clearMealEstimateApiLogs: () => call("clear_meal_estimate_api_logs"),

    generateProgressFeedback: (request) =>
      call("generate_progress_feedback", { request }),

    listWorkouts: (date) => call("list_workouts", { date }),
    addWorkout: (
      dayDate,
      workoutType,
      durationMin,
      intensity,
      calories,
      caloriesOverride
    ) =>
      call("add_workout", {
        dayDate,
        workoutType,
        durationMin,
        intensity,
        calories,
        caloriesOverride,
      }),
    updateWorkout: (
      id,
      workoutType,
      durationMin,
      intensity,
      calories,
      caloriesOverride
    ) =>
      call("update_workout", {
        id,
        workoutType,
        durationMin,
        intensity,
        calories,
        caloriesOverride,
      }),
    deleteWorkout: (id) => call("delete_workout", { id }),

    getMetricsRange: (start, end) =>
      call("get_metrics_range", { start, end }),
    getPeriodSummary: (days) => call("get_period_summary", { days }),
    getLatestWeight: (beforeDate) =>
      call("get_latest_weight", { beforeDate }),

    exportBackup: () => call("export_backup"),
    exportSyncSnapshot: () => call("export_sync_snapshot"),
    importBackup: (backup) => call("import_backup", { backup }),
    importSyncSnapshot: (snapshot) =>
      call("import_sync_snapshot", { snapshot }),
    getSyncState: () => call("get_sync_state"),
    saveGoogleAuth: (email, refreshToken) =>
      call("save_google_auth", { email, refreshToken }),
    clearGoogleAuth: () => call("clear_google_auth"),
    getGoogleRefreshToken: () => call("get_google_refresh_token"),
    markSynced: (syncedAt) => call("mark_synced", { syncedAt }),
    syncPush: (accessToken) => call("sync_push", { accessToken }),
    syncPull: (accessToken) => call("sync_pull", { accessToken }),
    readBackupFile: (path) => call("read_backup_file", { path }),
    writeBackupFile: (path, contents) =>
      call("write_backup_file", { path, contents }),
  };
}
