import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalorieTargetsEditor } from "../components/CalorieTargetsEditor";
import { MonthlyWeightGoalControl } from "../components/MonthlyWeightGoalControl";
import { MetabolismProfileFields } from "../components/MetabolismProfileFields";
import { NumberInput } from "../components/NumberInput";
import { NutrientLabel } from "../components/NutrientLabel";
import { ScoringWeightsEditor } from "../components/ScoringWeightsEditor";
import { SectionHeader } from "../components/SectionHeader";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useSync } from "../context/SyncContext";
import {
  ACCENT_COLOR_OPTIONS,
  applyAccentColor,
  DEFAULT_ACCENT_COLOR,
  normalizeAccentColor,
  type AccentColor,
} from "../lib/accentColor";
import { todayString } from "../lib/dates";
import {
  calculateDefaultMacroGoals,
  macroGoalsToSettings,
  settingsPatchFromManualCalorieTargets,
} from "../lib/metabolism";
import {
  DEFAULT_WEIGHT_CHANGE_RATE_UNIT,
  type Settings,
} from "../types";
import { defaultTargetMonthlyWeightChangeKg } from "../lib/metabolism";
import { calculateDefaultWaterGoalMl } from "../lib/hydration";

const inputClass =
  "w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none";

const MOCKUP_DRAFT: Partial<Settings> = {
  startingWeight: 85,
  targetWeight: 75,
  stepLengthM: 0.75,
  speedKmh: 4.5,
  dailyStepsGoal: 8000,
  dailyWaterGoalMl: 2000,
  dailyTeethBrushingsGoal: 2,
  workoutDaysPerWeek: 3,
  calorieIdealMin: 1800,
  calorieIdealMax: 2200,
  calorieWarningBelow: 1500,
  calorieWarning: 2500,
  calorieMax: 3000,
  targetMonthlyWeightChangeKg: defaultTargetMonthlyWeightChangeKg(),
  targetWeightChangeUnit: DEFAULT_WEIGHT_CHANGE_RATE_UNIT,
  heightCm: 175,
  birthDate: "1990-06-15",
  sex: "male",
  accentColor: "blue" as AccentColor,
  journeyStartDate: "2026-01-01",
  macroGoalCarbs: 180,
  macroGoalFat: 65,
  macroGoalProtein: 140,
  macroGoalFiber: 30,
  macroGoalSalt: 6,
  scoreWeightCalories: 60,
  scoreWeightWalking: 20,
  scoreWeightWorkout: 10,
  scoreWeightTeeth: 10,
  scoreWeightFoodKcal: 75,
  scoreWeightFoodMacros: 25,
};

type Props = {
  /** Dev-only walkthrough; does not write settings. */
  mockup?: boolean;
  /** Dev preview: which onboarding screen to open first. */
  initialPhase?: OnboardingPhase;
  /** Dev preview: which login UI state to show when `initialPhase` is login. */
  initialLoginPreview?: MockLoginPreview;
};

type OnboardingPhase = "account-choice" | "login" | "setup";

type MockLoginPreview =
  | "signed-out"
  | "syncing"
  | "no-profile"
  | "ready"
  | "not-configured";

const MOCK_LOGIN_PREVIEW_EMAIL = "preview.user@example.com";

function DevOnboardingPreviewBar({
  phase,
  loginPreview,
  onPhaseChange,
  onLoginPreviewChange,
}: {
  phase: OnboardingPhase;
  loginPreview: MockLoginPreview;
  onPhaseChange: (phase: OnboardingPhase) => void;
  onLoginPreviewChange: (preview: MockLoginPreview) => void;
}) {
  const phaseButtonClass = (active: boolean) =>
    `rounded-md px-2 py-1 transition-colors ${
      active
        ? "bg-amber-700/50 text-amber-50"
        : "text-amber-100/80 hover:bg-amber-900/50 hover:text-amber-50"
    }`;

  const previewButtonClass = (active: boolean) =>
    `rounded-md px-2 py-1 transition-colors ${
      active
        ? "bg-amber-700/40 text-amber-50"
        : "text-amber-100/70 hover:bg-amber-900/40 hover:text-amber-50"
    }`;

  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-amber-600/30 bg-amber-950/95 px-4 py-2 backdrop-blur-sm">
      <div className="mx-auto flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2 text-xs text-amber-100/90">
        <span className="font-medium text-amber-200">Dev preview</span>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => onPhaseChange("account-choice")}
            className={phaseButtonClass(phase === "account-choice")}
          >
            Account choice
          </button>
          <button
            type="button"
            onClick={() => onPhaseChange("login")}
            className={phaseButtonClass(phase === "login")}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => onPhaseChange("setup")}
            className={phaseButtonClass(phase === "setup")}
          >
            Setup
          </button>
        </div>
        {phase === "login" ? (
          <>
            <span className="hidden text-amber-200/60 sm:inline">|</span>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["signed-out", "Signed out"],
                  ["syncing", "Syncing"],
                  ["no-profile", "No profile"],
                  ["ready", "Ready"],
                  ["not-configured", "Not configured"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onLoginPreviewChange(id)}
                  className={previewButtonClass(loginPreview === id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : null}
        <Link
          to="/"
          className="ml-auto rounded-md px-2 py-1 text-amber-100/80 transition-colors hover:bg-amber-900/50 hover:text-amber-50"
        >
          Exit
        </Link>
      </div>
    </div>
  );
}

export function OnboardingPage({
  mockup = false,
  initialPhase = "account-choice",
  initialLoginPreview = "signed-out",
}: Props) {
  const { settings, save, refresh: refreshSettings } = useSettings();
  const {
    configured,
    signedIn,
    signIn,
    signOut,
    syncState,
    error: authError,
  } = useAuth();
  const { status, statusMessage } = useSync();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<OnboardingPhase>(
    mockup ? initialPhase : "account-choice"
  );
  const [mockLoginPreview, setMockLoginPreview] =
    useState<MockLoginPreview>(initialLoginPreview);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Partial<Settings>>(() =>
    mockup ? { ...MOCKUP_DRAFT } : {
      startingWeight: null,
      targetWeight: null,
      stepLengthM: 0.75,
      speedKmh: 4.5,
      dailyStepsGoal: 8000,
      dailyWaterGoalMl: 2000,
      dailyTeethBrushingsGoal: 2,
      workoutDaysPerWeek: 3,
      calorieIdealMin: 1200,
      calorieIdealMax: 1500,
      calorieWarningBelow: 1000,
      calorieWarning: 1500,
      calorieMax: 2000,
      targetMonthlyWeightChangeKg: defaultTargetMonthlyWeightChangeKg(),
      targetWeightChangeUnit: DEFAULT_WEIGHT_CHANGE_RATE_UNIT,
      heightCm: null,
      birthDate: null,
      sex: null,
      accentColor: DEFAULT_ACCENT_COLOR,
      journeyStartDate: todayString(),
      macroGoalCarbs: null,
      macroGoalFat: null,
      macroGoalProtein: null,
      macroGoalFiber: null,
      macroGoalSalt: null,
    }
  );
  const [macroHint, setMacroHint] = useState<string | null>(null);
  const [waterHint, setWaterHint] = useState<string | null>(null);

  useEffect(() => {
    if (mockup) return;
    applyAccentColor(normalizeAccentColor(draft.accentColor));
  }, [draft.accentColor, mockup]);

  useEffect(() => {
    if (mockup || !signedIn || status === "syncing" || status === "conflict") {
      return;
    }
    void refreshSettings();
  }, [mockup, signedIn, status, refreshSettings]);

  const handleSignIn = async () => {
    setAuthBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(String(e));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    setError(null);
    try {
      await signOut();
    } catch (e) {
      setError(String(e));
    } finally {
      setAuthBusy(false);
    }
  };

  const syncBusy = authBusy || status === "syncing";

  const devPreviewBar = mockup ? (
    <DevOnboardingPreviewBar
      phase={phase}
      loginPreview={mockLoginPreview}
      onPhaseChange={(next) => {
        setError(null);
        setPhase(next);
      }}
      onLoginPreviewChange={setMockLoginPreview}
    />
  ) : null;

  const devPreviewShellClass = mockup ? "pt-14" : "";

  const draftSettings = (): Settings =>
    ({
      ...(settings ?? {}),
      ...draft,
    }) as Settings;

  const autoCalculateMacros = () => {
    const result = calculateDefaultMacroGoals(draftSettings());
    if (!result.complete) {
      setMacroHint(
        `Add ${result.missing.join(", ")} (and calorie targets) to auto-calculate macros.`
      );
      return;
    }
    setMacroHint(null);
    setDraft({ ...draft, ...macroGoalsToSettings(result.goals) });
  };

  const autoCalculateWater = () => {
    const result = calculateDefaultWaterGoalMl(draftSettings());
    if (!result.complete) {
      setWaterHint(
        `Add ${result.missing.join(", ")} to auto-calculate water goal.`
      );
      return;
    }
    setWaterHint(null);
    setDraft({ ...draft, dailyWaterGoalMl: result.goalMl });
  };

  if (!mockup && !settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading...
      </div>
    );
  }

  const finish = async () => {
    if (mockup) {
      navigate("/", { replace: true });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const merged: Settings = {
        ...settings!,
        ...draft,
        stepLengthM: draft.stepLengthM ?? settings!.stepLengthM,
        speedKmh: draft.speedKmh ?? settings!.speedKmh,
        dailyStepsGoal: draft.dailyStepsGoal ?? settings!.dailyStepsGoal,
        dailyWaterGoalMl: draft.dailyWaterGoalMl ?? settings!.dailyWaterGoalMl,
        dailyTeethBrushingsGoal:
          draft.dailyTeethBrushingsGoal ?? settings!.dailyTeethBrushingsGoal,
        workoutDaysPerWeek:
          draft.workoutDaysPerWeek ?? settings!.workoutDaysPerWeek,
        calorieIdealMin: draft.calorieIdealMin ?? settings!.calorieIdealMin,
        calorieIdealMax: draft.calorieIdealMax ?? settings!.calorieIdealMax,
        calorieWarningBelow:
          draft.calorieWarningBelow ?? settings!.calorieWarningBelow,
        calorieWarning: draft.calorieWarning ?? settings!.calorieWarning,
        calorieMax: draft.calorieMax ?? settings!.calorieMax,
        targetMonthlyWeightChangeKg:
          draft.targetMonthlyWeightChangeKg ??
          settings!.targetMonthlyWeightChangeKg ??
          defaultTargetMonthlyWeightChangeKg(),
        targetWeightChangeUnit:
          draft.targetWeightChangeUnit ??
          settings!.targetWeightChangeUnit ??
          DEFAULT_WEIGHT_CHANGE_RATE_UNIT,
        startingWeight: draft.startingWeight ?? null,
        targetWeight: draft.targetWeight ?? null,
        heightCm: draft.heightCm ?? null,
        birthDate: draft.birthDate ?? null,
        sex: draft.sex ?? null,
        accentColor: normalizeAccentColor(
          draft.accentColor ?? settings!.accentColor
        ),
        journeyStartDate: draft.journeyStartDate ?? null,
        onboardingComplete: true,
      };
      const macroDefaults = calculateDefaultMacroGoals(merged);
      const hasMacroGoals =
        draft.macroGoalCarbs != null ||
        draft.macroGoalFat != null ||
        draft.macroGoalProtein != null ||
        draft.macroGoalFiber != null ||
        draft.macroGoalSalt != null;
      const macroPatch = hasMacroGoals
        ? {
            macroGoalCarbs: draft.macroGoalCarbs ?? null,
            macroGoalFat: draft.macroGoalFat ?? null,
            macroGoalProtein: draft.macroGoalProtein ?? null,
            macroGoalFiber: draft.macroGoalFiber ?? null,
            macroGoalSalt: draft.macroGoalSalt ?? null,
          }
        : macroDefaults.complete
          ? macroGoalsToSettings(macroDefaults.goals)
          : {};
      await save({
        ...merged,
        ...macroPatch,
      });
      navigate("/", { replace: true });
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      title: "Welcome to Health Tracker",
      body: "Track weight, nutrition, activity, and habits over time. Let's set up your goals!",
      content: null,
    },
    {
      title: "Appearance",
      body: "Pick an accent color for buttons, navigation, links, and other UI highlights.",
      content: (
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLOR_OPTIONS.map((opt) => {
            const selected =
              normalizeAccentColor(draft.accentColor) === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  setDraft({ ...draft, accentColor: opt.id as AccentColor })
                }
                className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected
                    ? "border-accent-50 bg-accent-muted text-accent-soft"
                    : "border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-300"
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
      ),
    },
    {
      title: "Journey start date",
      body: "Days before this date are hidden from the timeline, dashboard, and analytics.",
      content: (
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Start date
          </label>
          <input
            type="date"
            className={inputClass}
            value={draft.journeyStartDate ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                journeyStartDate: e.target.value || null,
              })
            }
          />
        </div>
      ),
    },
    {
      title: "Your metabolism",
      body: "Used for BMR and monthly calorie goals; daily burn also uses logged walking and workouts.",
      content: (
        <MetabolismProfileFields
          values={{
            heightCm: draft.heightCm ?? null,
            birthDate: draft.birthDate ?? null,
            sex: draft.sex ?? null,
          }}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
        />
      ),
    },
    {
      title: "Weight and calories targets",
      body: "Your weight goal sets calorie targets and objectives on the dashboard.",
      content: (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Starting weight (kg)
              </label>
              <NumberInput
                className={inputClass}
                value={draft.startingWeight ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    startingWeight: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Target weight (kg)
              </label>
              <NumberInput
                className={inputClass}
                value={draft.targetWeight ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    targetWeight: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
              />
            </div>
          </div>
          <div className="mt-4">
            <MonthlyWeightGoalControl
              settings={
                {
                  ...(settings ?? {}),
                  ...draft,
                } as Settings
              }
              applyGoalWhenProfileReady
              onApply={(patch) => setDraft({ ...draft, ...patch })}
            />
          </div>
          <div className="mt-4">
            <CalorieTargetsEditor
              targets={{
                calorieIdealMin: draft.calorieIdealMin ?? 1200,
                calorieIdealMax: draft.calorieIdealMax ?? 1500,
                calorieWarningBelow: draft.calorieWarningBelow ?? 1000,
                calorieWarning: draft.calorieWarning ?? 1500,
                calorieMax: draft.calorieMax ?? 2000,
              }}
              onChange={(targets) =>
                setDraft({
                  ...draft,
                  ...settingsPatchFromManualCalorieTargets(
                    {
                      ...(settings ?? {}),
                      ...draft,
                      calorieIdealMin: targets.calorieIdealMin,
                      calorieIdealMax: targets.calorieIdealMax,
                      calorieWarningBelow: targets.calorieWarningBelow,
                      calorieWarning: targets.calorieWarning,
                      calorieMax: targets.calorieMax,
                    } as Settings,
                    targets
                  ),
                })
              }
            />
          </div>
        </>
      ),
    },
    {
      title: "Macro nutrient goals",
      body: "Daily macro nutrient targets in grams, for food scoring and macro rings on the dashboard.",
      content: (
        <>
          {macroHint ? (
            <p className="mb-4 text-sm text-amber-400/90">{macroHint}</p>
          ) : null}
          <div className="grid grid-cols-3 gap-3">
            <MacroField
              label={<NutrientLabel nutrient="carbs" suffix=" (g)" />}
              value={draft.macroGoalCarbs ?? ""}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  macroGoalCarbs: v ? parseFloat(v) : null,
                })
              }
            />
            <MacroField
              label={<NutrientLabel nutrient="fat" suffix=" (g)" />}
              value={draft.macroGoalFat ?? ""}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  macroGoalFat: v ? parseFloat(v) : null,
                })
              }
            />
            <MacroField
              label={<NutrientLabel nutrient="protein" suffix=" (g)" />}
              value={draft.macroGoalProtein ?? ""}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  macroGoalProtein: v ? parseFloat(v) : null,
                })
              }
            />
            <MacroField
              label={<NutrientLabel nutrient="fiber" suffix=" (g)" />}
              value={draft.macroGoalFiber ?? ""}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  macroGoalFiber: v ? parseFloat(v) : null,
                })
              }
            />
            <MacroField
              label={<NutrientLabel nutrient="salt" suffix=" (g)" />}
              value={draft.macroGoalSalt ?? ""}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  macroGoalSalt: v ? parseFloat(v) : null,
                })
              }
            />
            <div className="flex flex-col items-center">
              <span
                className="mb-1 block w-full text-xs invisible select-none"
                aria-hidden
              >
                &nbsp;
              </span>
              <button
                type="button"
                onClick={autoCalculateMacros}
                className="mt-0.5 cursor-pointer whitespace-nowrap rounded-xl bg-slate-700 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-600"
              >
                Auto Calculate
              </button>
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Physical activity goals",
      body: "Daily steps and how many days per week you plan to work out. Multiple workouts on the same day count as one workout day.",
      content: (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Daily steps goal
            </label>
            <NumberInput
              className={inputClass}
              value={draft.dailyStepsGoal ?? 8000}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  dailyStepsGoal: parseInt(e.target.value, 10) || 8000,
                })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Workout days per week
            </label>
            <NumberInput
              className={inputClass}
              min={1}
              max={7}
              value={draft.workoutDaysPerWeek ?? 3}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  workoutDaysPerWeek: Math.min(
                    7,
                    Math.max(1, parseInt(e.target.value, 10) || 3)
                  ),
                })
              }
            />
          </div>
        </div>
      ),
    },
    {
      title: "Hydration & habits",
      body: "Daily targets for water intake and teeth brushing. Both contribute to your daily score on the dashboard.",
      content: (
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <SectionHeader
                  kind="water"
                  className="text-sm font-medium text-slate-400"
                >
                  Hydration
                </SectionHeader>
                <p className="mt-1 text-xs text-slate-500">
                  Daily water intake target in milliliters. Auto Calculate uses
                  body weight and activity level.
                </p>
              </div>
              <button
                type="button"
                onClick={autoCalculateWater}
                className="shrink-0 cursor-pointer rounded-xl bg-slate-700 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-600"
              >
                Auto Calculate
              </button>
            </div>
            <label className="mb-1 block text-xs text-slate-500">
              Daily water goal (ml)
            </label>
            <NumberInput
              className={inputClass}
              min={0}
              step={100}
              value={draft.dailyWaterGoalMl ?? 2000}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  dailyWaterGoalMl: parseInt(e.target.value, 10) || 2000,
                })
              }
            />
            {waterHint ? (
              <p className="mt-2 text-xs text-amber-600/90">{waterHint}</p>
            ) : null}
          </div>
          <div>
            <SectionHeader
              kind="teeth"
              className="mb-1 text-sm font-medium text-slate-400"
            >
              Teeth brushing
            </SectionHeader>
            <p className="mb-3 text-xs text-slate-500">
              How many times per day you aim to brush your teeth.
            </p>
            <label className="mb-1 block text-xs text-slate-500">
              Daily brushing goal
            </label>
            <NumberInput
              className={inputClass}
              min={1}
              max={10}
              value={draft.dailyTeethBrushingsGoal ?? 2}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  dailyTeethBrushingsGoal: Math.min(
                    10,
                    Math.max(1, parseInt(e.target.value, 10) || 2)
                  ),
                })
              }
            />
          </div>
        </div>
      ),
    },
    {
      title: "Daily score weights",
      body: "Each day you get a score from 0 to 100. On the dashboard, circular progress rings show this at a glance: one large ring for your overall score, and smaller rings underneath for food, steps, water, and teeth. They fill as you hit your goals. The sliders below set how much each area counts toward the big ring. Set a weight to 0 to leave that area out of your score and remove its small ring.",
      content: (
        <ScoringWeightsEditor
          settings={draftSettings()}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
        />
      ),
    },
  ];

  const current = steps[step];

  if (phase === "account-choice") {
    return (
      <>
        {devPreviewBar}
        <div
          className={`flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100 ${devPreviewShellClass}`}
        >
        <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
          <h2 className="mb-2 text-xl font-semibold text-slate-100">
            Welcome to Health Tracker
          </h2>
          <p className="mb-6 text-sm text-slate-300">
            Track weight, nutrition, activity, and habits over time. Already use
            Health Tracker on another device? Sign in to restore your data
            instead of setting up again.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPhase("login");
              }}
              className="cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent-hover"
            >
              Sign in to existing account
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPhase("setup");
              }}
              className="cursor-pointer rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:bg-slate-700"
            >
              I&apos;m new — set up my goals
            </button>
          </div>
        </div>
        </div>
      </>
    );
  }

  if (phase === "login") {
    const previewConfigured =
      mockup && mockLoginPreview === "not-configured" ? false : configured;
    const previewSignedIn = mockup
      ? mockLoginPreview !== "signed-out" &&
        mockLoginPreview !== "not-configured"
      : signedIn;
    const previewSyncBusy =
      mockup && mockLoginPreview === "syncing" ? true : syncBusy;
    const previewEmail = mockup
      ? MOCK_LOGIN_PREVIEW_EMAIL
      : syncState?.googleAccountEmail;
    const previewOnboardingComplete = mockup
      ? mockLoginPreview === "ready"
      : Boolean(settings?.onboardingComplete);

    const loginStatusMessage = (() => {
      if (previewSyncBusy) return "Signing in and syncing your data…";
      if (!mockup && status === "conflict") {
        return "This device and your cloud copy both changed. Choose which copy to keep in the dialog.";
      }
      if (previewSignedIn && (mockup || status === "upToDate")) {
        return mockup ? "Sync complete." : statusMessage ?? "Sync complete.";
      }
      return mockup ? null : statusMessage;
    })();

    return (
      <>
        {devPreviewBar}
        <div
          className={`flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100 ${devPreviewShellClass}`}
        >
        <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
          <h2 className="mb-2 text-xl font-semibold text-slate-100">
            Sign in to your account
          </h2>
          <p className="mb-6 text-sm text-slate-300">
            Sign in with Google to download your goals, logs, and settings from
            another device.
          </p>
          {!previewConfigured ? (
            <p className="text-sm text-amber-400/90">
              Google Sign-In is not configured for this build. Add{" "}
              <code className="text-xs">VITE_GOOGLE_CLIENT_ID</code> to a{" "}
              <code className="text-xs">.env</code> file (see{" "}
              <code className="text-xs">.env.example</code>).
            </p>
          ) : previewSignedIn ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-200">
                Signed in as{" "}
                <span className="font-medium text-slate-100">
                  {previewEmail}
                </span>
              </p>
              {loginStatusMessage ? (
                <p className="text-xs text-slate-500">{loginStatusMessage}</p>
              ) : null}
              {previewSyncBusy ? (
                <p className="text-sm text-slate-400">Please wait…</p>
              ) : previewOnboardingComplete ? (
                <p className="text-sm text-accent-soft">
                  Your account data is ready. Opening the app…
                </p>
              ) : (
                <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <p className="text-sm text-slate-300">
                    No completed profile was found in your Google account. You
                    can set up this device now — your data will sync once setup
                    is finished.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setPhase("setup");
                      }}
                      className="cursor-pointer rounded-xl bg-accent px-4 py-1.5 text-sm transition-colors hover:bg-accent-hover"
                    >
                      Continue setup
                    </button>
                    <button
                      type="button"
                      disabled={previewSyncBusy || mockup}
                      onClick={() => void handleSignOut()}
                      className="cursor-pointer rounded-xl border border-slate-600 px-4 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={previewSyncBusy || mockup}
              onClick={() => void handleSignIn()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sign in with Google
            </button>
          )}
          {!mockup && (error || authError) && (
            <p className="mt-4 text-sm text-red-400">{error ?? authError}</p>
          )}
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={previewSyncBusy}
              onClick={() => {
                setError(null);
                setPhase("account-choice");
              }}
              className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-700"
            >
              Back
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {devPreviewBar}
      <div
        className={`flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100 ${devPreviewShellClass}`}
      >
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
        <p className="mb-6 text-xs font-medium text-accent">
          Step {step + 1} of {steps.length}
        </p>
        <h2 className="mb-2 text-xl font-semibold text-slate-100">
          {current.title}
        </h2>
        {current.body ? (
          <p className="mb-6 text-sm text-slate-300">{current.body}</p>
        ) : null}
        {current.content}
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}
        <div className="mt-8 flex items-center justify-between gap-3">
          <div>
            {step > 0 ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => setStep((s) => s - 1)}
                className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-700"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setError(null);
                  setPhase("account-choice");
                }}
                className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-700"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="cursor-pointer rounded-xl bg-accent px-4 py-1.5 text-sm transition-colors hover:bg-accent-hover"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={saving}
                className="cursor-pointer rounded-xl bg-accent px-4 py-1.5 text-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mockup
                  ? "Finish preview"
                  : saving
                    ? "Saving..."
                    : "Get started"}
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

function MacroField({
  label,
  value,
  onChange,
}: {
  label: ReactNode;
  value: string | number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <NumberInput
        className="w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
