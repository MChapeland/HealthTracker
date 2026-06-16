import type { AiFeedbackTopic, MetricsPoint } from "../../types";
import type { AnalysisContext } from "./types";

export interface AiFeedbackTopicDefinition {
  id: AiFeedbackTopic;
  label: string;
  description: string;
  defaultSelected?: boolean;
  emptyMessage: string;
  promptFragment: string;
}

export const DEFAULT_AI_FEEDBACK_TOPIC: AiFeedbackTopic = "generalOverview";

export const AI_FEEDBACK_TOPICS: AiFeedbackTopicDefinition[] = [
  {
    id: "generalOverview",
    label: "General health overview",
    description:
      "Looks across your recent logs and highlights what is going well, what may need attention, and what to focus on next.",
    defaultSelected: true,
    emptyMessage:
      "Log at least 10 days across any categories in the last 30 days for a useful overview.",
    promptFragment:
      "Summarize cross-domain trends. Highlight one strength and one area to focus on next week.",
  },
  {
    id: "consistency",
    label: "Consistency / logging habits",
    description:
      "Looks at how consistently you log calories, steps, workouts, water, and tooth brushing, highlights missed days, and suggests where logging gaps may be hiding useful patterns.",
    emptyMessage:
      "We need at least 14 days in your 30-day window to assess logging consistency.",
    promptFragment:
      "Focus on logging consistency, not performance shame. Suggest one simple logging habit to improve.",
  },
  {
    id: "weightTrend",
    label: "Weight trend",
    description:
      "Looks at your recent weight trend, calories, steps, workouts, and possible reasons for scale fluctuations.",
    emptyMessage:
      "Log your weight on at least 4 days in the last 30 days to analyze your trend.",
    promptFragment:
      "Interpret weight trend using computed averages and regression. Explain fluctuations cautiously.",
  },
  {
    id: "nutrition",
    label: "Nutrition / calories",
    description:
      "Looks at calorie consistency, possible under/overeating patterns, missing logs, and how your intake compares to your goal.",
    emptyMessage:
      "Log food on at least 7 days in the last 30 days to analyze nutrition patterns.",
    promptFragment:
      "Focus on calorie consistency vs goals. Do not recommend extreme restriction.",
  },
  {
    id: "activity",
    label: "Activity / steps",
    description:
      "Looks at step averages, trends, inactive days, and how your activity compares to your goal.",
    emptyMessage:
      "Log steps on at least 7 days in the last 30 days to analyze activity.",
    promptFragment: "Focus on step trends and consistency, not single-day spikes.",
  },
  {
    id: "workouts",
    label: "Workouts / exercise",
    description:
      "Looks at workout frequency, consistency, recent changes, and whether your activity pattern supports your goal.",
    emptyMessage:
      "Log at least 2 workout days in the last 30 days to analyze exercise patterns.",
    promptFragment:
      "If recentlyIncreasedTrainingLoad, mention fatigue/recovery gently without diagnosing injury or overtraining.",
  },
  {
    id: "hydration",
    label: "Hydration",
    description:
      "Looks at water intake averages, trends, consistency, and missing logs.",
    emptyMessage:
      "Log water on at least 7 days in the last 30 days to analyze hydration.",
    promptFragment: "Focus on hydration consistency relative to the user's goal.",
  },
  {
    id: "dentalHabits",
    label: "Dental habits",
    description:
      "Looks at tooth brushing frequency, consistency, missed days, and habit streaks.",
    emptyMessage:
      "Log tooth brushing on at least 7 days in the last 30 days to analyze dental habits.",
    promptFragment: "Encourage sustainable brushing habits without guilt.",
  },
  {
    id: "custom",
    label: "Custom question / other",
    description:
      "Ask something specific about your recent health logs. Add a note below with your question.",
    emptyMessage:
      "Log at least 10 days in the last 30 days and add a question (10+ characters) for custom feedback.",
    promptFragment:
      "Answer the user's specific question using computed metrics. Stay within wellness coaching scope.",
  },
];

export function getTopicDefinition(
  topic: AiFeedbackTopic
): AiFeedbackTopicDefinition {
  const def = AI_FEEDBACK_TOPICS.find((t) => t.id === topic);
  if (!def) throw new Error(`Unknown topic: ${topic}`);
  return def;
}

export function slimLogsForTopic(
  points: MetricsPoint[],
  topic: AiFeedbackTopic
): import("../../types").SlimDayLog[] {
  return points.map((p) => {
    const base = {
      date: p.date,
      weight: null as number | null,
      totalCalories: 0,
      steps: null as number | null,
      workedOut: false,
      workoutDurationMin: null as number | null,
      waterMl: null as number | null,
      teethBrushings: null as number | null,
    };
    switch (topic) {
      case "weightTrend":
        return { ...base, weight: p.weight };
      case "nutrition":
        return { ...base, totalCalories: p.totalCalories };
      case "activity":
        return { ...base, steps: p.steps };
      case "workouts":
        return {
          ...base,
          workedOut: p.workedOut,
          workoutDurationMin: p.workoutDurationMin,
        };
      case "hydration":
        return { ...base, waterMl: p.waterMl };
      case "dentalHabits":
        return { ...base, teethBrushings: p.teethBrushings };
      case "consistency":
      case "generalOverview":
      case "custom":
        return {
          date: p.date,
          weight: p.weight,
          totalCalories: p.totalCalories,
          steps: p.steps,
          workedOut: p.workedOut,
          workoutDurationMin: p.workoutDurationMin,
          waterMl: p.waterMl,
          teethBrushings: p.teethBrushings,
        };
      default:
        return base;
    }
  });
}

export type { AnalysisContext };
