import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { exportBackupToFile } from "../lib/backupExport";
import { importBackupFromFile } from "../lib/backupImport";
import { useAuth } from "../context/AuthContext";
import { useSync } from "../context/SyncContext";
import { formatSyncTime } from "../lib/sync";
import { CalorieTargetsEditor } from "../components/CalorieTargetsEditor";
import { GeminiModelSelect } from "../components/GeminiModelSelect";
import { MealEstimateApiLogPanel } from "../components/MealEstimateApiLogPanel";
import { MonthlyWeightGoalControl } from "../components/MonthlyWeightGoalControl";
import { MetabolismProfileFields } from "../components/MetabolismProfileFields";
import { NumberInput } from "../components/NumberInput";
import { PageHeader, pageHeaderActionButtonClass } from "../components/PageHeader";
import { PageLayout } from "../components/PageLayout";
import { SectionHeader } from "../components/SectionHeader";
import { ScoringWeightsEditor } from "../components/ScoringWeightsEditor";
import { NutrientLabel } from "../components/NutrientLabel";
import { useSettings } from "../hooks/useSettings";
import {
  calculateDefaultMacroGoals,
  macroGoalsToSettings,
  settingsPatchFromManualCalorieTargets,
} from "../lib/metabolism";
import { calculateDefaultWaterGoalMl } from "../lib/hydration";
import {
  ACCENT_COLOR_OPTIONS,
  normalizeAccentColor,
  type AccentColor,
} from "../lib/accentColor";
import {
  normalizeGeminiModel,
} from "../lib/geminiModels";
import type { Settings } from "../types";

export function SettingsPage() {
  const { settings, loading, save: saveSettings, refresh: refreshSettings } = useSettings();
  const {
    signedIn,
    configured,
    syncState,
    signIn,
    signOut,
    error: authError,
  } = useAuth();
  const { status, statusMessage, syncNow } = useSync();
  const [message, setMessage] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (!settings) return;
    setApiKeyDraft(settings.aiApiKey ?? "");
  }, [settings?.aiApiKey]);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      const current = settingsRef.current;
      if (!current) return;
      const next = { ...current, ...patch };
      void saveSettings(next).catch((e) => {
        setMessage(String(e));
        setTimeout(() => setMessage(null), 4000);
      });
    },
    [saveSettings]
  );

  const exportData = async () => {
    try {
      const ok = await exportBackupToFile();
      if (ok) {
        setMessage("Backup exported.");
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (e) {
      setMessage(String(e));
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const importData = async () => {
    try {
      const ok = await importBackupFromFile();
      if (ok) {
        await refreshSettings();
        setMessage("Backup imported.");
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (e) {
      setMessage(String(e));
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleSignIn = async () => {
    setAuthBusy(true);
    try {
      await signIn();
      setMessage("Signed in with Google.");
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage(String(e));
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    try {
      await signOut();
      setMessage("Signed out.");
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage(String(e));
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncBusy(true);
    try {
      await syncNow();
      await refreshSettings();
      setMessage("Sync complete.");
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage(String(e));
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSyncBusy(false);
    }
  };

  const syncStatusLabel = (() => {
    if (syncBusy || status === "syncing") return "Syncing…";
    if (status === "conflict") return "Needs attention (conflict)";
    if (status === "error") return statusMessage ?? "Sync error";
    if (status === "upToDate") {
      return syncState?.lastSyncedAt
        ? `Up to date · ${formatSyncTime(syncState.lastSyncedAt)}`
        : "Up to date";
    }
    return statusMessage ?? "Not synced yet";
  })();

  if (loading || !settings) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const s = settings;

  return (
    <PageLayout
      header={
        <PageHeader
          page="settings"
          title="Settings"
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={importData}
                className={pageHeaderActionButtonClass}
              >
                Import backup
              </button>
              <button
                type="button"
                onClick={exportData}
                className={pageHeaderActionButtonClass}
              >
                Export backup
              </button>
            </div>
          }
        />
      }
    >
      {message && (
        <p className="rounded-lg bg-accent-deep px-3 py-2 text-sm text-accent-deep">
          {message}
        </p>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <SectionHeader kind="sync" className="mb-1 text-sm font-medium text-slate-400">
          Account &amp; sync
        </SectionHeader>
        <p className="mb-3 text-xs text-slate-500">
          Optional: sign in with Google to sync your health data across devices.
          The app works fully offline without an account. Cloud data is stored in
          your Google Drive app folder (not visible in normal Drive browsing).
        </p>
        {!configured ? (
          <p className="text-sm text-amber-400/90">
            Google Sign-In is not configured for this build. Add{" "}
            <code className="text-xs">VITE_GOOGLE_CLIENT_ID</code> to a{" "}
            <code className="text-xs">.env</code> file (see{" "}
            <code className="text-xs">.env.example</code>).
          </p>
        ) : signedIn ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-200">
              Signed in as{" "}
              <span className="font-medium text-slate-100">
                {syncState?.googleAccountEmail}
              </span>
            </p>
            <p className="text-xs text-slate-500">{syncStatusLabel}</p>
            {authError && (
              <p className="text-xs text-red-400">{authError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={syncBusy || authBusy}
                onClick={() => void handleSyncNow()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                Sync now
              </button>
              <button
                type="button"
                disabled={authBusy}
                onClick={() => void handleSignOut()}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void handleSignIn()}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50"
            >
              Sign in with Google
            </button>
            {authError && (
              <p className="text-xs text-red-400">{authError}</p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <SectionHeader kind="appearance" className="mb-1 text-sm font-medium text-slate-400">
          Appearance
        </SectionHeader>
        <p className="mb-3 text-xs text-slate-500">
          Accent color for buttons, navigation, links, and other UI highlights.
        </p>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLOR_OPTIONS.map((opt) => {
            const selected =
              normalizeAccentColor(s.accentColor) === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ accentColor: opt.id as AccentColor })}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected
                    ? "border-accent-50 bg-accent-muted text-accent-soft"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: opt.swatch }}
                  aria-hidden
                />
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <SectionHeader kind="journey" className="text-sm font-medium text-slate-400">
              Journey start date
            </SectionHeader>
            <p className="mt-1 text-xs text-slate-500">
              Days before this date are hidden from the timeline, dashboard, and
              analytics.
            </p>
          </div>
          <input
            type="date"
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            value={s.journeyStartDate ?? ""}
            onChange={(e) =>
              update({
                journeyStartDate: e.target.value || null,
              })
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <SectionHeader kind="metabolism" className="mb-1 text-sm font-medium text-slate-400">
          Metabolism profile
        </SectionHeader>
        <p className="mb-3 text-xs text-slate-500">
          Used for BMR and monthly calorie goals; daily burn also uses logged
          walking and workouts.
        </p>
        <MetabolismProfileFields values={s} onChange={update} />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <SectionHeader kind="weight" className="mb-1 text-sm font-medium text-slate-400">
          Weight and calories targets
        </SectionHeader>
        <p className="mb-3 text-xs text-slate-500">
          Your weight goal sets calorie targets and objectives on the dashboard.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Starting weight (kg)"
            type="number"
            value={s.startingWeight ?? ""}
            onChange={(v) =>
              update({ startingWeight: v ? parseFloat(v) : null })
            }
          />
          <Field
            label="Target weight (kg)"
            type="number"
            value={s.targetWeight ?? ""}
            onChange={(v) =>
              update({ targetWeight: v ? parseFloat(v) : null })
            }
          />
        </div>
        <div className="mt-4">
          <MonthlyWeightGoalControl
            settings={s}
            onApply={(patch) => update(patch)}
          />
        </div>
        <div className="mt-3">
          <CalorieTargetsEditor
            targets={{
              calorieIdealMin: s.calorieIdealMin,
              calorieIdealMax: s.calorieIdealMax,
              calorieWarningBelow: s.calorieWarningBelow,
              calorieWarning: s.calorieWarning,
              calorieMax: s.calorieMax,
            }}
            onChange={(targets) =>
              update(settingsPatchFromManualCalorieTargets(s, targets))
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <SectionHeader kind="calories" className="text-sm font-medium text-slate-400">
              Macro nutrient goals
            </SectionHeader>
            <p className="mt-1 text-xs text-slate-500">
              Daily macro nutrient targets in grams, for food scoring and macro
              rings on the dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const result = calculateDefaultMacroGoals(s);
              if (!result.complete) {
                setMessage(
                  `Add ${result.missing.join(", ")} (and calorie targets) to auto-calculate macros.`
                );
                setTimeout(() => setMessage(null), 5000);
                return;
              }
              update(macroGoalsToSettings(result.goals));
            }}
            className="shrink-0 cursor-pointer rounded-xl bg-slate-700 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-600"
          >
            Auto Calculate
          </button>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <Field
            label={<NutrientLabel nutrient="carbs" suffix=" (g)" />}
            type="number"
            value={s.macroGoalCarbs ?? ""}
            onChange={(v) =>
              update({
                macroGoalCarbs: v ? parseFloat(v) : null,
              })
            }
          />
          <Field
            label={<NutrientLabel nutrient="fat" suffix=" (g)" />}
            type="number"
            value={s.macroGoalFat ?? ""}
            onChange={(v) =>
              update({
                macroGoalFat: v ? parseFloat(v) : null,
              })
            }
          />
          <Field
            label={<NutrientLabel nutrient="protein" suffix=" (g)" />}
            type="number"
            value={s.macroGoalProtein ?? ""}
            onChange={(v) =>
              update({
                macroGoalProtein: v ? parseFloat(v) : null,
              })
            }
          />
          <Field
            label={<NutrientLabel nutrient="fiber" suffix=" (g)" />}
            type="number"
            value={s.macroGoalFiber ?? ""}
            onChange={(v) =>
              update({
                macroGoalFiber: v ? parseFloat(v) : null,
              })
            }
          />
          <Field
            label={<NutrientLabel nutrient="salt" suffix=" (g)" />}
            type="number"
            value={s.macroGoalSalt ?? ""}
            onChange={(v) =>
              update({
                macroGoalSalt: v ? parseFloat(v) : null,
              })
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <SectionHeader
          kind="physicalActivity"
          className="mb-1 text-sm font-medium text-slate-400"
        >
          Physical activity goals
        </SectionHeader>
        <p className="mb-3 text-xs text-slate-500">
          Daily steps and how many days per week you plan to work out. Multiple
          workouts on the same day count as one workout day.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Daily steps goal"
            type="number"
            value={s.dailyStepsGoal}
            onChange={(v) =>
              update({ dailyStepsGoal: parseInt(v, 10) || 8000 })
            }
          />
          <Field
            label="Workout days per week"
            type="number"
            min={1}
            max={7}
            value={s.workoutDaysPerWeek}
            onChange={(v) =>
              update({
                workoutDaysPerWeek: Math.min(
                  7,
                  Math.max(1, parseInt(v, 10) || 3)
                ),
              })
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <SectionHeader kind="water" className="text-sm font-medium text-slate-400">
              Hydration
            </SectionHeader>
            <p className="mt-1 text-xs text-slate-500">
              Daily water intake target in milliliters. Auto Calculate uses body
              weight and activity level.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const result = calculateDefaultWaterGoalMl(s);
              if (!result.complete) {
                setMessage(
                  `Add ${result.missing.join(", ")} to auto-calculate water goal.`
                );
                setTimeout(() => setMessage(null), 5000);
                return;
              }
              update({ dailyWaterGoalMl: result.goalMl });
            }}
            className="shrink-0 cursor-pointer rounded-xl bg-slate-700 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-600"
          >
            Auto Calculate
          </button>
        </div>
        <Field
          label="Daily water goal (ml)"
          type="number"
          min={0}
          value={s.dailyWaterGoalMl}
          onChange={(v) =>
            update({ dailyWaterGoalMl: parseInt(v, 10) || 2000 })
          }
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <SectionHeader kind="teeth" className="mb-1 text-sm font-medium text-slate-400">
          Teeth brushing
        </SectionHeader>
        <p className="mb-3 text-xs text-slate-500">
          How many times per day you aim to brush your teeth.
        </p>
        <Field
          label="Daily brushing goal"
          type="number"
          min={1}
          max={10}
          value={s.dailyTeethBrushingsGoal}
          onChange={(v) =>
            update({
              dailyTeethBrushingsGoal: Math.min(
                10,
                Math.max(1, parseInt(v, 10) || 2)
              ),
            })
          }
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <SectionHeader kind="dailyScore" className="mb-1 text-sm font-medium text-slate-400">
          Daily score
        </SectionHeader>
        <p className="mb-3 text-xs text-slate-500">
          Each day is rated from 0 to 100 from your logged food, activity, and
          habits. Thresholds set what counts as a good or bad day; weights set
          how much each area matters; the dashboard rings show your progress at a
          glance.
        </p>
        <ScoringWeightsEditor
          settings={s}
          onChange={update}
          showThresholds
          weightsIntro="How much food, walking, water, and teeth brushing contribute to your daily score."
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionHeader kind="aiEstimation" className="text-sm font-medium text-slate-400">
            AI features
          </SectionHeader>
          <label className="group relative inline-flex shrink-0 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={s.aiEnabled}
              onChange={(e) => update({ aiEnabled: e.target.checked })}
              aria-label="Enable AI features"
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="flex h-6 w-11 shrink-0 items-center rounded-full border border-slate-600 bg-slate-800 p-1 shadow-inner transition-colors hover:border-slate-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-400"
            >
              <span className="h-3.5 w-3.5 shrink-0 translate-x-0 rounded-full bg-slate-500 shadow-sm transition-[transform,background-color] duration-300 ease-in-out group-has-[:checked]:translate-x-5 group-has-[:checked]:bg-slate-400" />
            </span>
          </label>
        </div>

        <div className={s.aiEnabled ? undefined : "pointer-events-none opacity-50"}>
          <p className="mb-3 text-xs text-slate-500">
            Shared Gemini API key for meal estimates and progress feedback. Get a
            free key from{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-accent-soft hover:text-accent"
              tabIndex={s.aiEnabled ? undefined : -1}
            >
              Google AI Studio
            </a>
            . Your key stays on this device in the local database.
          </p>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Gemini API key
              </label>
              <div className="relative">
                <input
                  type={apiKeyVisible ? "text" : "password"}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-3 pr-10 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  value={apiKeyDraft}
                  disabled={!s.aiEnabled}
                  placeholder="Paste your API key"
                  autoComplete="off"
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  onBlur={() => {
                    const trimmed = apiKeyDraft.trim();
                    if (!trimmed) return;
                    if (trimmed === (settingsRef.current?.aiApiKey ?? "")) {
                      return;
                    }
                    update({ aiApiKey: trimmed });
                  }}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 transition-colors hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={apiKeyVisible ? "Hide API key" : "Show API key"}
                  disabled={!s.aiEnabled}
                  onClick={() => setApiKeyVisible((visible) => !visible)}
                >
                  <i
                    aria-hidden
                    className={`fa-solid ${apiKeyVisible ? "fa-eye-slash" : "fa-eye"} text-sm`}
                  />
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Gemini model
              </label>
              <GeminiModelSelect
                value={normalizeGeminiModel(s.aiModel)}
                disabled={!s.aiEnabled}
                onChange={(model) => update({ aiModel: model })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
              <span className="text-sm text-slate-300">Meal estimation</span>
              <label className="group relative inline-flex shrink-0 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={s.mealEstimateEnabled}
                  onChange={(e) =>
                    update({ mealEstimateEnabled: e.target.checked })
                  }
                  disabled={!s.aiEnabled}
                  aria-label="Enable meal estimation"
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="flex h-6 w-11 shrink-0 items-center rounded-full border border-slate-600 bg-slate-800 p-1 shadow-inner transition-colors hover:border-slate-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-400"
                >
                  <span className="h-3.5 w-3.5 shrink-0 translate-x-0 rounded-full bg-slate-500 shadow-sm transition-[transform,background-color] duration-300 ease-in-out group-has-[:checked]:translate-x-5 group-has-[:checked]:bg-slate-400" />
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
              <span className="text-sm text-slate-300">Progress feedback</span>
              <label className="group relative inline-flex shrink-0 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={s.aiFeedbackEnabled}
                  onChange={(e) =>
                    update({ aiFeedbackEnabled: e.target.checked })
                  }
                  disabled={!s.aiEnabled}
                  aria-label="Enable AI progress feedback"
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="flex h-6 w-11 shrink-0 items-center rounded-full border border-slate-600 bg-slate-800 p-1 shadow-inner transition-colors hover:border-slate-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-400"
                >
                  <span className="h-3.5 w-3.5 shrink-0 translate-x-0 rounded-full bg-slate-500 shadow-sm transition-[transform,background-color] duration-300 ease-in-out group-has-[:checked]:translate-x-5 group-has-[:checked]:bg-slate-400" />
                </span>
              </label>
            </div>

            {import.meta.env.DEV && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-3 py-2">
                <div>
                  <span className="text-sm text-slate-300">Verbose AI logging</span>
                  <p className="text-xs text-slate-500">
                    Dev only — stores full prompts and responses in API logs.
                  </p>
                </div>
                <label className="group relative inline-flex shrink-0 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={s.aiVerboseLogging}
                    onChange={(e) =>
                      update({ aiVerboseLogging: e.target.checked })
                    }
                    disabled={!s.aiEnabled}
                    aria-label="Enable verbose AI logging"
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className="flex h-6 w-11 shrink-0 items-center rounded-full border border-slate-600 bg-slate-800 p-1 shadow-inner transition-colors hover:border-slate-500"
                  >
                    <span className="h-3.5 w-3.5 shrink-0 translate-x-0 rounded-full bg-slate-500 shadow-sm transition-[transform,background-color] duration-300 ease-in-out group-has-[:checked]:translate-x-5 group-has-[:checked]:bg-slate-400" />
                  </span>
                </label>
              </div>
            )}

            <MealEstimateApiLogPanel enabled={s.aiEnabled && s.mealEstimateEnabled} />
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  min,
  max,
  placeholder,
  onBlur,
  disabled = false,
}: {
  label: ReactNode;
  type: string;
  value: string | number;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      {type === "number" ? (
        <NumberInput
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}
    </div>
  );
}
