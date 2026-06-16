import { describe, expect, it } from "vitest";
import { analyzeWeightTrend } from "../weightTrendAnalyzer";
import { analyzeWorkouts } from "../workoutsAnalyzer";
import { analyzeConsistency } from "../consistencyAnalyzer";
import { analyzeProgress } from "../analyzeProgress";
import { buildProgressFeedbackRequest } from "../buildPayload";
import { DEFAULT_AI_FEEDBACK_TOPIC } from "../topics";
import type { AnalysisContext } from "../types";
import type { MetricsPoint, PeriodSummary, Settings, Streaks } from "../../../types";

function baseSettings(): Settings {
  return {
    startingWeight: 90,
    targetWeight: 80,
    targetMonthlyWeightChangeKg: -2,
    targetWeightChangeUnit: "month",
    stepLengthM: 0.75,
    speedKmh: 4.5,
    stepsPerKm: null,
    dailyStepsGoal: 8000,
    dailyWaterGoalMl: 2000,
    dailyTeethBrushingsGoal: 2,
    workoutDaysPerWeek: 3,
    calorieIdealMin: 1200,
    calorieIdealMax: 1500,
    calorieWarningBelow: 1000,
    calorieWarning: 1800,
    calorieMax: 2000,
    scoreWeightCalories: 60,
    scoreWeightWalking: 20,
    scoreWeightWorkout: 10,
    scoreWeightTeeth: 10,
    scoreGoodThreshold: 75,
    scoreOkayThreshold: 25,
    onboardingComplete: true,
    journeyStartDate: "2025-01-01",
    heightCm: 175,
    birthDate: "1990-01-01",
    sex: "male",
    activityLevel: "moderate",
    macroGoalCarbs: null,
    macroGoalFat: null,
    macroGoalProtein: null,
    macroGoalFiber: null,
    macroGoalSalt: null,
    scoreWeightFoodKcal: 75,
    scoreWeightFoodMacros: 25,
    accentColor: "blue",
    aiEnabled: true,
    aiApiKey: "test",
    aiModel: "gemini-2.5-flash",
    mealEstimateEnabled: true,
    aiFeedbackEnabled: true,
    aiVerboseLogging: false,
  };
}

function emptySummary(): PeriodSummary {
  return {
    daysLogged: 0,
    avgCalories: null,
    workoutCount: 0,
    goodDayPercent: null,
    avgSteps: null,
    avgWaterMl: null,
    totalCalories: null,
    weightLogDays: 0,
    avgDistanceKm: null,
    okayDayPercent: null,
    weightLostKg: null,
  };
}

function emptyStreaks(): Streaks {
  return {
    goodDays: 0,
    workoutWeeks: 0,
    loggedDays: 0,
    calorieGoalDays: 0,
    stepsGoalDays: 0,
    waterGoalDays: 0,
    teethGoalDays: 0,
  };
}

function makeMetrics(
  days: Array<Partial<MetricsPoint> & { date: string }>
): MetricsPoint[] {
  return days.map((d) => ({
    date: d.date,
    weight: d.weight ?? null,
    totalCalories: d.totalCalories ?? 0,
    steps: d.steps ?? null,
    distanceKm: d.distanceKm ?? null,
    durationMin: d.durationMin ?? null,
    workedOut: d.workedOut ?? false,
    workoutDurationMin: d.workoutDurationMin ?? null,
    workoutIntensity: d.workoutIntensity ?? null,
    workoutCalories: d.workoutCalories ?? null,
    workoutCaloriesOverride: d.workoutCaloriesOverride ?? false,
    dailyScore: d.dailyScore ?? null,
    waterMl: d.waterMl ?? null,
    teethBrushings: d.teethBrushings ?? null,
  }));
}

describe("aiFeedback", () => {
  it("defaults to generalOverview topic", () => {
    expect(DEFAULT_AI_FEEDBACK_TOPIC).toBe("generalOverview");
  });

  it("detects insufficient weight data", () => {
    const ctx: AnalysisContext = {
      metrics: makeMetrics([
        { date: "2026-01-01", weight: 90 },
        { date: "2026-01-02", weight: 89.8 },
      ]),
      settings: baseSettings(),
      streaks: emptyStreaks(),
      periodSummary: emptySummary(),
    };
    const result = analyzeWeightTrend(ctx);
    expect(result.sufficiency).toBe("insufficient");
  });

  it("detects downward trend with noisy weights", () => {
    const metrics = makeMetrics(
      Array.from({ length: 10 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, "0")}`,
        weight: 90 - i * 0.15 + (i % 2 === 0 ? 0.3 : -0.2),
        totalCalories: 1400,
      }))
    );
    const result = analyzeWeightTrend({
      metrics,
      settings: baseSettings(),
      streaks: emptyStreaks(),
      periodSummary: emptySummary(),
    });
    expect(result.sufficiency).toBe("sufficient");
    expect(result.metrics.trendKgPerWeek).toBeTypeOf("number");
  });

  it("classifies recentlyIncreasedTrainingLoad", () => {
    const metrics = makeMetrics(
      Array.from({ length: 21 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, "0")}`,
        workedOut: i >= 14 ? true : i % 4 === 0,
        workoutDurationMin: i >= 14 ? 60 : i % 4 === 0 ? 30 : 0,
      }))
    );
    const result = analyzeWorkouts({
      metrics,
      settings: baseSettings(),
      streaks: emptyStreaks(),
      periodSummary: emptySummary(),
    });
    expect(result.localStatus).toBe("recentlyIncreasedTrainingLoad");
  });

  it("builds payload with user note", () => {
    const analysis = analyzeProgress("weightTrend", {
      metrics: makeMetrics(
        Array.from({ length: 8 }, (_, i) => ({
          date: `2026-01-${String(i + 1).padStart(2, "0")}`,
          weight: 90 - i * 0.1,
        }))
      ),
      settings: baseSettings(),
      streaks: emptyStreaks(),
      periodSummary: emptySummary(),
      userNote: "Why is my weight stalled?",
    });
    const payload = buildProgressFeedbackRequest(
      "weightTrend",
      analysis,
      baseSettings(),
      "Why is my weight stalled?"
    );
    expect(payload.userNote).toBe("Why is my weight stalled?");
  });

  it("requires note for custom topic", () => {
    const result = analyzeProgress("custom", {
      metrics: makeMetrics(
        Array.from({ length: 12 }, (_, i) => ({
          date: `2026-01-${String(i + 1).padStart(2, "0")}`,
          totalCalories: 1400,
        }))
      ),
      settings: baseSettings(),
      streaks: emptyStreaks(),
      periodSummary: emptySummary(),
      userNote: "short",
    });
    expect(result.sufficiency).toBe("insufficient");
  });

  it("scores consistency across domains", () => {
    const metrics = makeMetrics(
      Array.from({ length: 20 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, "0")}`,
        totalCalories: 1400,
        steps: 8000,
        waterMl: 2000,
        teethBrushings: 2,
        workedOut: i % 3 === 0,
      }))
    );
    const result = analyzeConsistency({
      metrics,
      settings: baseSettings(),
      streaks: emptyStreaks(),
      periodSummary: emptySummary(),
    });
    expect(result.sufficiency).toBe("sufficient");
    expect(result.metrics.overallLoggingScore).toBeGreaterThan(0.5);
  });
});
