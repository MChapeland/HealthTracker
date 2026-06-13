import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalorieZoneBar } from "../components/CalorieZoneBar";
import { DailyScorePanelColumn } from "../components/DailyScorePanel";
import { EnergyBalanceCard } from "../components/EnergyBalanceCard";
import { FoodMacroSummary } from "../components/FoodMacroSummary";
import { PageHeader } from "../components/PageHeader";
import { PageLayout } from "../components/PageLayout";
import { PhysicalActivitySummary } from "../components/PhysicalActivitySummary";
import { HydrationSummary } from "../components/HydrationSummary";
import { TeethBrushingSummary } from "../components/TeethBrushingSummary";
import { SectionHeader } from "../components/SectionHeader";
import { ThisWeekSection } from "../components/ThisWeekSection";
import { WeightProgressBar } from "../components/WeightProgressBar";
import { api } from "../lib/api";
import {
  averageDailyScore,
  computeDailyScore,
  resolveDayRating,
} from "../lib/scoring";
import { weightChangeDirectionFromMonthlyKg } from "../lib/metabolism";
import { computeStreaks, streakValueColorClass } from "../lib/streaks";
import {
  clampRangeStart,
  defaultRange,
  mergeDaysWithRange,
  todayString,
  minWeekOffset,
  weekRangeForOffset,
} from "../lib/dates";
import { formatWaterMl } from "../lib/hydration";
import { applyDisplayScores } from "../lib/syncDayScores";
import { DAILY_SCORE_SIDE_PANEL_CLASS, DAILY_SCORE_TOP_GRID_CLASS } from "../lib/dailyScoreLayout";
import type { SectionIconKind } from "../lib/sectionIcons";
import { useSettings } from "../hooks/useSettings";
import type { DayRecord, PeriodSummary } from "../types";

export function DashboardPage() {
  const { settings, loading: settingsLoading, error, refresh } = useSettings();
  const [today, setToday] = useState<DayRecord | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [summary30, setSummary30] = useState<PeriodSummary | null>(null);
  const [avgDailyScore30, setAvgDailyScore30] = useState<number | null>(null);
  const [streaks, setStreaks] = useState({
    goodDays: 0,
    workoutWeeks: 0,
    loggedDays: 0,
    calorieGoalDays: 0,
    stepsGoalDays: 0,
    waterGoalDays: 0,
    teethGoalDays: 0,
  });
  const [weekOffset, setWeekOffset] = useState(0);
  const [loadedDays, setLoadedDays] = useState<DayRecord[]>([]);

  useEffect(() => {
    const t = todayString();
    Promise.all([
      api.getDay(t),
      api.getLatestWeight(t),
      api.getPeriodSummary(30),
      api.listDays(
        clampRangeStart(
          defaultRange(90, settings?.journeyStartDate).start,
          settings?.journeyStartDate
        ),
        t
      ),
    ]).then(([day, weight, s30, days]) => {
      setToday(day);
      setCurrentWeight(weight ?? day.weight);
      setSummary30(s30);
      if (settings) {
        const withRatings = days.map((d) => ({
          ...d,
          dailyScore: resolveDayRating(d, settings) ?? d.dailyScore,
        }));
        setStreaks(
          computeStreaks(withRatings, settings, {
            ...day,
            dailyScore: resolveDayRating(day, settings) ?? day.dailyScore,
          })
        );
        const start30 = clampRangeStart(
          defaultRange(30, settings.journeyStartDate).start,
          settings.journeyStartDate
        );
        setAvgDailyScore30(
          averageDailyScore(withRatings, settings, start30)
        );
        setLoadedDays(withRatings);
      }
    });
  }, [settings]);

  const weekDays = useMemo(() => {
    if (!settings) return [];
    const week = weekRangeForOffset(weekOffset);
    const weekMerged = mergeDaysWithRange(
      loadedDays.filter((d) => d.date >= week.start && d.date <= week.end),
      week.start,
      week.end
    );
    return applyDisplayScores(weekMerged, settings);
  }, [loadedDays, weekOffset, settings]);

  useEffect(() => {
    if (!settings) return;
    const min = minWeekOffset(settings.journeyStartDate);
    setWeekOffset((o) => (o < min ? min : o));
  }, [settings?.journeyStartDate]);

  if (settingsLoading || !settings) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
        {settingsLoading ? (
          <p>Loading...</p>
        ) : (
          <>
            <p className="text-sm text-red-400">
              {error ?? "Could not load settings."}
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              Retry
            </button>
          </>
        )}
      </div>
    );
  }

  const weight = today?.weight ?? currentWeight;
  const showWeightGoal =
    weightChangeDirectionFromMonthlyKg(settings.targetMonthlyWeightChangeKg) !==
    "maintain";
  const scoreBreakdown = computeDailyScore(
    {
      totalCalories: today?.totalCalories ?? 0,
      totalCarbs: today?.totalCarbs ?? null,
      totalFat: today?.totalFat ?? null,
      totalProtein: today?.totalProtein ?? null,
      totalFiber: today?.totalFiber ?? null,
      totalSalt: today?.totalSalt ?? null,
      steps: today?.steps ?? null,
      waterMl: today?.waterMl ?? null,
      teethBrushings: today?.teethBrushings ?? null,
    },
    settings
  );

  return (
    <PageLayout
      header={
        <PageHeader
          page="dashboard"
          title="Dashboard"
          actions={
            <Link
              to={`/day/${todayString()}`}
              state={{ from: "dashboard" }}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium hover:bg-accent-hover"
            >
              Log today
            </Link>
          }
        />
      }
    >
      <div className={`mb-6 ${DAILY_SCORE_TOP_GRID_CLASS}`}>
        <DailyScorePanelColumn breakdown={scoreBreakdown} settings={settings} />
        <div className={DAILY_SCORE_SIDE_PANEL_CLASS}>
          <SectionHeader
            kind="streaks"
            className="mb-4 shrink-0 text-sm font-medium text-slate-400"
          >
            Streaks
          </SectionHeader>
          <div className="flex flex-1 flex-col justify-center divide-y divide-slate-800 text-sm">
            {[
              { label: "Logged", value: streaks.loggedDays },
              { label: "Good days", value: streaks.goodDays },
              { label: "Calorie goal", value: streaks.calorieGoalDays },
              { label: "Steps goal", value: streaks.stepsGoalDays },
              { label: "Water goal", value: streaks.waterGoalDays },
              { label: "Teeth goal", value: streaks.teethGoalDays },
              { label: "Workout weeks", value: streaks.workoutWeeks },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-slate-400">{s.label}</span>
                <span
                  className={`font-medium tabular-nums ${streakValueColorClass(s.value)}`}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <SummaryCard
          headerKind="periodSummary"
          title="Last 30 days"
          summary={summary30}
          avgDailyScore={avgDailyScore30}
        />
      </div>

      <div className="space-y-6">
        <ThisWeekSection
          days={weekDays}
          settings={settings}
          weekOffset={weekOffset}
          onPrevWeek={() =>
            setWeekOffset((o) =>
              Math.max(minWeekOffset(settings.journeyStartDate), o - 1)
            )
          }
          onNextWeek={() => setWeekOffset((o) => o + 1)}
          onTodayWeek={() => setWeekOffset(0)}
        />
        {showWeightGoal && (
          <WeightProgressBar
            startingWeight={settings.startingWeight}
            targetWeight={settings.targetWeight}
            currentWeight={weight}
          />
        )}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <SectionHeader
            kind="calories"
            className="mb-4 text-sm font-medium text-slate-400"
          >
            Nutrition goal
          </SectionHeader>
          <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:gap-5">
            <div className="min-w-0 flex-1">
              <CalorieZoneBar
                className="w-full"
                calories={today?.totalCalories ?? 0}
                settings={settings}
                hideTitle
              />
            </div>
            <div className="shrink-0 lg:w-44 lg:border-l lg:border-slate-800 lg:pl-5">
              <EnergyBalanceCard
                settings={settings}
                caloriesEaten={today?.totalCalories ?? 0}
                dayWeight={today?.weight ?? currentWeight}
                activity={{
                  steps: today?.steps ?? null,
                  distanceKm: today?.distanceKm ?? null,
                  durationMin: today?.durationMin ?? null,
                  workedOut: today?.workedOut ?? false,
                  workoutDurationMin: today?.workoutDurationMin ?? null,
                  workoutIntensity: today?.workoutIntensity ?? null,
                  workoutCalories: today?.workoutCalories ?? null,
                  workoutCaloriesOverride: today?.workoutCaloriesOverride ?? false,
                }}
                compact
                embedded
              />
            </div>
          </div>
          {today && (
            <FoodMacroSummary
              settings={settings}
              showDivider={false}
              totals={{
                carbs: today.totalCarbs,
                fat: today.totalFat,
                protein: today.totalProtein,
                fiber: today.totalFiber,
                salt: today.totalSalt,
              }}
              className="mt-4"
            />
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <HydrationSummary settings={settings} day={today} />
          <TeethBrushingSummary settings={settings} day={today} />
        </div>
        <PhysicalActivitySummary
          settings={settings}
          day={today}
          dayWeight={weight}
        />
      </div>
    </PageLayout>
  );
}

function SummaryCard({
  title,
  headerKind,
  summary,
  avgDailyScore,
  className = "",
}: {
  title: string;
  headerKind: SectionIconKind;
  summary: PeriodSummary | null;
  avgDailyScore?: number | null;
  className?: string;
}) {
  if (!summary) return null;

  const weightChangeKg = -(summary.weightLostKg ?? 0);

  const stats: { label: string; value: string; isZero: boolean }[] = [
    {
      label: "Days logged",
      value: String(summary.daysLogged),
      isZero: summary.daysLogged <= 0,
    },
    {
      label: "Avg daily score",
      value: String(avgDailyScore ?? 0),
      isZero: (avgDailyScore ?? 0) <= 0,
    },
    {
      label: "Avg calories",
      value: String(
        summary.avgCalories != null ? summary.avgCalories.toFixed(0) : 0
      ),
      isZero: (summary.avgCalories ?? 0) <= 0,
    },
    {
      label: "Avg steps",
      value: Math.round(summary.avgSteps ?? 0).toLocaleString(),
      isZero: (summary.avgSteps ?? 0) <= 0,
    },
    {
      label: "Avg water",
      value: formatWaterMl(Math.round(summary.avgWaterMl ?? 0)),
      isZero: (summary.avgWaterMl ?? 0) <= 0,
    },
    {
      label: "Workout days",
      value: String(summary.workoutCount),
      isZero: summary.workoutCount <= 0,
    },
    {
      label: "Weight change",
      value:
        weightChangeKg === 0
          ? "0.0 kg"
          : `${weightChangeKg > 0 ? "+" : ""}${weightChangeKg.toFixed(1)} kg`,
      isZero: weightChangeKg === 0,
    },
  ];

  return (
    <div
      className={`${DAILY_SCORE_SIDE_PANEL_CLASS} ${className}`}
    >
      <SectionHeader
        kind={headerKind}
        className="mb-4 shrink-0 text-sm font-medium text-slate-400"
      >
        {title}
      </SectionHeader>
      <div className="flex flex-1 flex-col justify-center divide-y divide-slate-800 text-sm">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span className="text-slate-400">{s.label}</span>
            <span
              className={`font-medium tabular-nums ${
                s.isZero ? "text-slate-500" : "text-slate-200"
              }`}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
