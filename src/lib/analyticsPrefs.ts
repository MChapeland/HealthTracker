import type { AnalyticsRange } from "./dates";

const STORAGE_KEY = "health-tracker.analyticsRange";
const SHOW_AVERAGE_KEY = "health-tracker.analyticsShowAverage";
const SHOW_TREND_KEY = "health-tracker.analyticsShowTrend";
const CHART_TOGGLES_KEY = "health-tracker.analyticsChartToggles";

export type AnalyticsChartToggle = {
  trend: boolean;
  average: boolean;
  goal: boolean;
};

export type AnalyticsChartToggles = {
  weight: AnalyticsChartToggle;
  calories: AnalyticsChartToggle;
  steps: AnalyticsChartToggle;
  water: AnalyticsChartToggle;
  teeth: AnalyticsChartToggle;
  workouts: AnalyticsChartToggle;
  deficit: AnalyticsChartToggle;
};

const OFF: AnalyticsChartToggle = { trend: false, average: false, goal: false };

const DEFAULT_CHART_TOGGLES: AnalyticsChartToggles = {
  weight: { trend: true, average: false, goal: false },
  calories: { ...OFF },
  steps: { ...OFF },
  water: { ...OFF },
  teeth: { ...OFF },
  workouts: { ...OFF },
  deficit: { ...OFF },
};

function mergeChartToggle(
  parsed: Partial<AnalyticsChartToggle> | undefined,
  defaults: AnalyticsChartToggle
): AnalyticsChartToggle {
  return {
    trend: parsed?.trend ?? defaults.trend,
    average: parsed?.average ?? defaults.average,
    goal: parsed?.goal ?? defaults.goal,
  };
}

const VALID_RANGES: AnalyticsRange[] = [
  "7d",
  "30d",
  "3m",
  "6m",
  "1y",
  "5y",
  "all",
];

export function loadAnalyticsRange(): AnalyticsRange {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_RANGES.includes(stored as AnalyticsRange)) {
      return stored as AnalyticsRange;
    }
  } catch {
    /* storage unavailable */
  }
  return "3m";
}

export function saveAnalyticsRange(range: AnalyticsRange): void {
  try {
    localStorage.setItem(STORAGE_KEY, range);
  } catch {
    /* storage unavailable */
  }
}

export function loadAnalyticsShowAverage(): boolean {
  try {
    const stored = localStorage.getItem(SHOW_AVERAGE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    /* storage unavailable */
  }
  return false;
}

export function saveAnalyticsShowAverage(showAverage: boolean): void {
  try {
    localStorage.setItem(SHOW_AVERAGE_KEY, String(showAverage));
  } catch {
    /* storage unavailable */
  }
}

export function loadAnalyticsShowTrend(): boolean {
  try {
    const stored = localStorage.getItem(SHOW_TREND_KEY);
    if (stored === "false") return false;
    if (stored === "true") return true;
  } catch {
    /* storage unavailable */
  }
  return false;
}

export function saveAnalyticsShowTrend(showTrend: boolean): void {
  try {
    localStorage.setItem(SHOW_TREND_KEY, String(showTrend));
  } catch {
    /* storage unavailable */
  }
}

function chartTogglesFromLegacy(): AnalyticsChartToggles {
  try {
    const hasLegacy =
      localStorage.getItem(SHOW_TREND_KEY) != null ||
      localStorage.getItem(SHOW_AVERAGE_KEY) != null;
    if (hasLegacy) {
      const trend = loadAnalyticsShowTrend();
      const average = loadAnalyticsShowAverage();
      const legacyToggle = { trend, average, goal: false };
      return {
        weight: legacyToggle,
        calories: legacyToggle,
        steps: legacyToggle,
        water: legacyToggle,
        teeth: legacyToggle,
        workouts: legacyToggle,
        deficit: legacyToggle,
      };
    }
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_CHART_TOGGLES;
}

export function loadAnalyticsChartToggles(): AnalyticsChartToggles {
  try {
    const stored = localStorage.getItem(CHART_TOGGLES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AnalyticsChartToggles>;
      return {
        weight: mergeChartToggle(parsed.weight, DEFAULT_CHART_TOGGLES.weight),
        calories: mergeChartToggle(
          parsed.calories,
          DEFAULT_CHART_TOGGLES.calories
        ),
        steps: mergeChartToggle(parsed.steps, DEFAULT_CHART_TOGGLES.steps),
        water: mergeChartToggle(parsed.water, DEFAULT_CHART_TOGGLES.water),
        teeth: mergeChartToggle(parsed.teeth, DEFAULT_CHART_TOGGLES.teeth),
        workouts: mergeChartToggle(
          parsed.workouts,
          DEFAULT_CHART_TOGGLES.workouts
        ),
        deficit: mergeChartToggle(
          parsed.deficit,
          DEFAULT_CHART_TOGGLES.deficit
        ),
      };
    }
  } catch {
    /* storage unavailable or invalid JSON */
  }
  return chartTogglesFromLegacy();
}

export function saveAnalyticsChartToggles(toggles: AnalyticsChartToggles): void {
  try {
    localStorage.setItem(CHART_TOGGLES_KEY, JSON.stringify(toggles));
  } catch {
    /* storage unavailable */
  }
}
