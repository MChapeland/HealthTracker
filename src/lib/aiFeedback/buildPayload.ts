import type {
  AiFeedbackTopic,
  ProgressAnalysisResult,
  ProgressFeedbackRequest,
  Settings,
} from "../../types";

export function buildProgressFeedbackRequest(
  topic: AiFeedbackTopic,
  analysis: ProgressAnalysisResult,
  settings: Settings,
  userNote?: string
): ProgressFeedbackRequest {
  return {
    topic,
    userNote: userNote?.trim() || undefined,
    analysisPeriodDays: 30,
    generatedAt: new Date().toISOString(),
    userContext: {
      startingWeight: settings.startingWeight,
      targetWeight: settings.targetWeight,
      targetMonthlyWeightChangeKg: settings.targetMonthlyWeightChangeKg,
      dailyStepsGoal: settings.dailyStepsGoal,
      dailyWaterGoalMl: settings.dailyWaterGoalMl,
      dailyTeethBrushingsGoal: settings.dailyTeethBrushingsGoal,
      workoutDaysPerWeek: settings.workoutDaysPerWeek,
      calorieIdealMin: settings.calorieIdealMin,
      calorieIdealMax: settings.calorieIdealMax,
      journeyStartDate: settings.journeyStartDate,
    },
    computed: {
      localStatus: analysis.localStatus,
      localStatusReason: analysis.localStatusReason,
      confidence: analysis.confidence,
      confidenceReason: analysis.confidenceReason,
      metrics: analysis.metrics,
      warnings: analysis.warnings,
    },
    recentLogs: analysis.recentLogs,
  };
}
