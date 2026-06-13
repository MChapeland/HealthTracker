import { useEffect, useMemo, useState } from "react";
import { DropdownSelect } from "../components/DropdownSelect";
import {
  ANALYTICS_AVERAGE_ICON,
  ANALYTICS_TREND_ICON,
  AnalyticsChartIconToggle,
  AnalyticsChartToolbar,
  ANALYTICS_GOAL_ICON,
} from "../components/AnalyticsChartControls";
import {
  AnalyticsTooltipContent,
  AnalyticsTooltipDate,
  AnalyticsTooltipPrimary,
  AnalyticsTooltipSecondary,
  analyticsChartTooltipProps,
} from "../components/AnalyticsChartTooltip";
import { createVerticalCalorieZoneBarShape } from "../components/VerticalCalorieZoneBarShape";
import { SectionHeader } from "../components/SectionHeader";
import { PageHeader } from "../components/PageHeader";
import { PageLayout } from "../components/PageLayout";
import { useSettings } from "../hooks/useSettings";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  loadAnalyticsChartToggles,
  loadAnalyticsRange,
  saveAnalyticsChartToggles,
  saveAnalyticsRange,
  type AnalyticsChartToggles,
} from "../lib/analyticsPrefs";
import { accentCssVar } from "../lib/accentColor";
import { calorieTooltipValueClass } from "../lib/calories";
import { buildDeficitChartData } from "../lib/deficitAnalytics";
import { interpolateLoggedSeries } from "../lib/analyticsTrend";
import { api } from "../lib/api";
import {
  analyticsRange,
  formatShortDate,
  todayString,
  type AnalyticsRange,
} from "../lib/dates";
import {
  averageLoggedWeight,
  formatWeightAxisTick,
  formatWeightTooltipKg,
  interpolateWeightSeries,
  mergeMetricsWithRange,
  normalizeLoggedWeight,
  weightAxisConfig,
} from "../lib/weightAnalytics";
import { formatDeficit, formatKgChangeShort, resolveWeightForMetabolism, resolveWorkoutCalories } from "../lib/metabolism";
import { formatWaterMl } from "../lib/hydration";
import { formatTeethCount } from "../lib/teethBrushing";
import { normalizeWorkoutIntensity } from "../lib/workout";
import type { MetricsPoint, Settings, WorkoutIntensity } from "../types";

const WORKOUT_INTENSITY_COLORS: Record<WorkoutIntensity, string> = {
  low: "#34d399",
  medium: "#fbbf24",
  high: "#f87171",
};

const CHART_MARGIN = { top: 16, right: 20, left: 0, bottom: 0 };
/** Cap bar width when the range has few data points. */
const BAR_MAX_SIZE = 32;
const BAR_TOP_RADIUS: [number, number, number, number] = [10, 10, 0, 0];
const BAR_FILL_OPACITY = 0.5;

const CHART_X_AXIS = {
  tick: { fontSize: 10 },
  stroke: "#64748b",
  height: 24,
  tickMargin: 2,
  tickLine: false,
  axisLine: false,
  interval: "preserveStartEnd" as const,
};

/** Unique yyyy-MM-dd keys; labels formatted on the axis so categories are not collapsed. */
const CHART_DATE_AXIS = {
  ...CHART_X_AXIS,
  dataKey: "dateKey",
  tickFormatter: (value: string) => formatShortDate(value),
};

const CHART_Y_AXIS = {
  tick: { fontSize: 10 },
  stroke: "#64748b",
  width: 36,
  tickMargin: 2,
  tickLine: false,
  axisLine: false,
};

const ACCENT_STROKE = accentCssVar("400");
const ACCENT_STROKE_SOFT = accentCssVar("300");
const WATER_BAR_FILL = "#38bdf8";
const TEETH_BAR_FILL = "#94a3b8";

const ANALYTICS_TREND_LINE_PROPS = {
  type: "monotone" as const,
  stroke: ACCENT_STROKE,
  dot: false,
  activeDot: false,
  tooltipType: "none" as const,
};

function PeriodAverageReferenceLine({ value }: { value: number }) {
  return (
    <ReferenceLine
      y={value}
      stroke={ACCENT_STROKE}
      strokeDasharray="4 4"
      ifOverflow="visible"
    />
  );
}

function GoalReferenceLine({ value }: { value: number }) {
  return (
    <ReferenceLine
      y={value}
      stroke="#64748b"
      strokeDasharray="6 4"
      ifOverflow="visible"
    />
  );
}

function caloriesAxisMax(maxCalories: number): number {
  if (maxCalories <= 0) return 2000;
  if (maxCalories <= 1200) return Math.ceil(maxCalories / 300) * 300;
  if (maxCalories <= 2500) return Math.ceil(maxCalories / 500) * 500;
  return Math.ceil(maxCalories / 1000) * 1000;
}

function caloriesAxisTicks(axisMax: number): number[] {
  const step = axisMax <= 1200 ? 300 : axisMax <= 2500 ? 500 : 1000;
  const ticks: number[] = [];
  for (let v = 0; v <= axisMax; v += step) ticks.push(v);
  return ticks;
}

function formatCaloriesTick(value: number): string {
  if (value >= 1000 && value % 500 === 0) return `${value / 1000}k`;
  return String(value);
}

function workoutCaloriesForPoint(
  point: MetricsPoint,
  settings: Settings | null
): number {
  if (!settings || !point.workedOut || point.workoutDurationMin == null) return 0;
  const weightKg = resolveWeightForMetabolism(point.weight, settings);
  if (weightKg == null) return 0;
  return resolveWorkoutCalories(
    {
      steps: point.steps,
      distanceKm: point.distanceKm,
      durationMin: point.durationMin,
      workedOut: point.workedOut,
      workoutDurationMin: point.workoutDurationMin,
      workoutIntensity: normalizeWorkoutIntensity(point.workoutIntensity),
      workoutCalories: point.workoutCalories,
      workoutCaloriesOverride: point.workoutCaloriesOverride,
    },
    weightKg
  );
}

type WeightChartPoint = {
  dateKey: string;
  weight: number | null;
  weightLogged: number | null;
};

function loggedWeightScatterShape(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      fill={ACCENT_STROKE}
      stroke="#0f172a"
      strokeWidth={1}
    />
  );
}

function loggedWeightScatterActiveShape(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={ACCENT_STROKE}
      stroke={ACCENT_STROKE_SOFT}
      strokeWidth={2}
    />
  );
}

function WeightChartTooltip({
  active,
  payload,
  showAverage,
  periodAvg,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: WeightChartPoint }>;
  showAverage: boolean;
  periodAvg: number | null;
}) {
  const point = payload?.[0]?.payload as WeightChartPoint | undefined;
  return (
    <AnalyticsTooltipContent
      active={active}
      payload={payload}
      visible={point?.weightLogged != null}
    >
      {({ date }) => (
        <>
          <AnalyticsTooltipDate>{date}</AnalyticsTooltipDate>
          <AnalyticsTooltipPrimary>
            {formatWeightTooltipKg(point!.weightLogged!)} kg
          </AnalyticsTooltipPrimary>
          {showAverage && periodAvg != null && (
            <AnalyticsTooltipSecondary>
              Period avg: {formatWeightTooltipKg(periodAvg)} kg
            </AnalyticsTooltipSecondary>
          )}
        </>
      )}
    </AnalyticsTooltipContent>
  );
}

function periodAverage(
  data: MetricsPoint[],
  key: keyof MetricsPoint
): number | null {
  const vals = data
    .map((p) => p[key])
    .filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function averageLoggedSteps(data: MetricsPoint[]): number | null {
  const vals = data
    .map((p) => p.steps)
    .filter((s): s is number => s != null && s > 0);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function averageLoggedWater(data: MetricsPoint[]): number | null {
  const vals = data
    .map((p) => p.waterMl)
    .filter((w): w is number => w != null && w > 0);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function averageLoggedTeethBrushings(data: MetricsPoint[]): number | null {
  const vals = data
    .map((p) => p.teethBrushings)
    .filter((t): t is number => t != null && t > 0);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function formatWaterAxisTick(value: number): string {
  if (value >= 1000 && value % 1000 === 0) return `${value / 1000}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}L`;
  return String(value);
}

function workoutValueForPoint(
  point: MetricsPoint,
  settings: Settings | null,
  metric: "durationMin" | "calories"
): number | null {
  if (!point.workedOut) return null;
  const durationMin =
    point.workoutDurationMin != null ? point.workoutDurationMin : 0;
  const calories = workoutCaloriesForPoint(point, settings);
  const value = metric === "durationMin" ? durationMin : calories;
  return value > 0 ? value : null;
}

function averageWorkoutValues(
  data: MetricsPoint[],
  settings: Settings | null,
  metric: "durationMin" | "calories"
): number | null {
  const vals = data
    .map((p) => workoutValueForPoint(p, settings, metric))
    .filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function AnalyticsPage() {
  const { settings } = useSettings();
  const [rangeSelection, setRangeSelection] =
    useState<AnalyticsRange>(loadAnalyticsRange);
  const [data, setData] = useState<MetricsPoint[]>([]);
  const [workoutMetric, setWorkoutMetric] = useState<"durationMin" | "calories">(
    "durationMin"
  );
  const [deficitMetric, setDeficitMetric] = useState<"kcal" | "kg">("kcal");
  const [chartToggles, setChartToggles] = useState(loadAnalyticsChartToggles);

  const updateChartToggle = <
    C extends keyof AnalyticsChartToggles,
    K extends keyof AnalyticsChartToggles[C],
  >(
    chart: C,
    key: K,
    value: AnalyticsChartToggles[C][K]
  ) => {
    setChartToggles((prev) => {
      const next = {
        ...prev,
        [chart]: { ...prev[chart], [key]: value },
      };
      saveAnalyticsChartToggles(next);
      return next;
    });
  };

  const range = useMemo(
    () => analyticsRange(rangeSelection, settings?.journeyStartDate),
    [rangeSelection, settings?.journeyStartDate]
  );

  useEffect(() => {
    const today = todayString();
    api
      .getMetricsRange(range.start, range.end)
      .then((rows) => setData(rows.filter((p) => p.date < today)));
  }, [range]);

  const caloriesAxis = useMemo(() => {
    const maxCalories = Math.max(
      0,
      ...data.map((p) => p.totalCalories ?? 0)
    );
    const axisMax = caloriesAxisMax(maxCalories);
    return {
      axisMax,
      ticks: caloriesAxisTicks(axisMax),
    };
  }, [data]);

  const mergedMetrics = useMemo(
    () => mergeMetricsWithRange(data, range.start, range.end),
    [data, range]
  );

  const caloriesPeriodAvg = useMemo(
    () => periodAverage(data, "totalCalories"),
    [data]
  );

  const stepsPeriodAvg = useMemo(() => averageLoggedSteps(data), [data]);

  const waterPeriodAvg = useMemo(() => averageLoggedWater(data), [data]);

  const teethPeriodAvg = useMemo(
    () => averageLoggedTeethBrushings(data),
    [data]
  );

  const workoutPeriodAvg = useMemo(
    () => averageWorkoutValues(data, settings, workoutMetric),
    [data, settings, workoutMetric]
  );

  const weightPeriodAvg = useMemo(
    () => averageLoggedWeight(mergedMetrics),
    [mergedMetrics]
  );

  const chartData = useMemo(() => {
    const rows = mergedMetrics.map((p) => ({
      dateKey: p.date,
      calories: p.totalCalories,
      steps: p.steps ?? 0,
      hasSteps: p.steps != null && p.steps > 0,
      hasCalories: p.totalCalories > 0,
      workedOut: p.workedOut ? 1 : 0,
    }));
    const caloriesTrend = interpolateLoggedSeries(
      mergedMetrics.map((p) => ({
        date: p.date,
        value: p.totalCalories > 0 ? p.totalCalories : null,
      }))
    );
    const stepsTrend = interpolateLoggedSeries(
      mergedMetrics.map((p) => ({
        date: p.date,
        value:
          p.steps != null && p.steps > 0 ? p.steps : null,
      }))
    );
    return rows.map((row, i) => ({
      ...row,
      caloriesTrend: caloriesTrend[i],
      stepsTrend: stepsTrend[i],
    }));
  }, [mergedMetrics]);

  const weightChartData = useMemo(() => {
    const interpolatedWeight = interpolateWeightSeries(mergedMetrics);
    return mergedMetrics.map((p, i) => ({
      dateKey: p.date,
      weight: interpolatedWeight[i],
      weightLogged: normalizeLoggedWeight(p.weight),
    }));
  }, [mergedMetrics]);

  const weightAxis = useMemo(() => {
    const values = weightChartData.flatMap((p) =>
      [p.weight, p.weightLogged].filter((v): v is number => v != null)
    );
    if (
      chartToggles.weight.goal &&
      settings?.targetWeight != null &&
      settings.targetWeight > 0
    ) {
      values.push(settings.targetWeight);
    }
    return weightAxisConfig(values);
  }, [weightChartData, chartToggles.weight.goal, settings?.targetWeight]);

  const deficitChartData = useMemo(() => {
    const rows = buildDeficitChartData(mergedMetrics, settings);
    const deficitTrend = interpolateLoggedSeries(
      rows.map((r) => ({
        date: r.dateKey,
        value: r.hasDeficit ? r.deficit : null,
      }))
    );
    const kgTrend = interpolateLoggedSeries(
      rows.map((r) => ({
        date: r.dateKey,
        value:
          r.hasEstimatedKg && r.estimatedKgChange != null
            ? -r.estimatedKgChange
            : null,
      }))
    );
    return rows.map((row, i) => ({
      ...row,
      deficitTrend: deficitTrend[i],
      kg: kgTrend[i],
      kgBar:
        row.hasEstimatedKg && row.estimatedKgChange != null
          ? -row.estimatedKgChange
          : 0,
    }));
  }, [mergedMetrics, settings]);

  const deficitPeriodAvg = useMemo(() => {
    const vals = deficitChartData
      .filter((r) => r.hasDeficit)
      .map((r) => r.deficit);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [deficitChartData]);

  const kgPeriodAvg = useMemo(() => {
    const vals = deficitChartData
      .filter((r) => r.hasEstimatedKg && r.estimatedKgChange != null)
      .map((r) => r.estimatedKgChange as number);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [deficitChartData]);

  const kgPeriodAvgChart =
    kgPeriodAvg != null ? -kgPeriodAvg : null;

  const calorieBarShape = useMemo(() => {
    if (!settings || !chartToggles.calories.goal) return undefined;
    return createVerticalCalorieZoneBarShape({
      calorieIdealMin: settings.calorieIdealMin,
      calorieIdealMax: settings.calorieIdealMax,
      calorieWarningBelow: settings.calorieWarningBelow,
      calorieWarning: settings.calorieWarning,
      calorieMax: settings.calorieMax,
    });
  }, [settings, chartToggles.calories.goal]);

  const workoutChartData = useMemo(() => {
    const rows = mergedMetrics.map((p) => {
      const intensity = normalizeWorkoutIntensity(p.workoutIntensity);
      const loggedValue = workoutValueForPoint(p, settings, workoutMetric);
      const value = loggedValue ?? 0;
      return {
        dateKey: p.date,
        value,
        intensity,
        workedOut: p.workedOut,
        hasWorkout: p.workedOut && value > 0,
      };
    });
    const valueTrend = interpolateLoggedSeries(
      rows.map((r) => ({
        date: r.dateKey,
        value: r.hasWorkout ? r.value : null,
      }))
    );
    return rows.map((row, i) => ({
      ...row,
      valueTrend: valueTrend[i],
    }));
  }, [mergedMetrics, settings, workoutMetric]);

  const waterChartData = useMemo(() => {
    const rows = mergedMetrics.map((p) => ({
      dateKey: p.date,
      water: p.waterMl ?? 0,
      hasWater: p.waterMl != null && p.waterMl > 0,
    }));
    const waterTrend = interpolateLoggedSeries(
      mergedMetrics.map((p) => ({
        date: p.date,
        value: p.waterMl != null && p.waterMl > 0 ? p.waterMl : null,
      }))
    );
    return rows.map((row, i) => ({
      ...row,
      waterTrend: waterTrend[i],
    }));
  }, [mergedMetrics]);

  const teethChartData = useMemo(() => {
    const rows = mergedMetrics.map((p) => ({
      dateKey: p.date,
      teeth: p.teethBrushings ?? 0,
      hasTeeth: p.teethBrushings != null && p.teethBrushings > 0,
    }));
    const teethTrend = interpolateLoggedSeries(
      mergedMetrics.map((p) => ({
        date: p.date,
        value:
          p.teethBrushings != null && p.teethBrushings > 0
            ? p.teethBrushings
            : null,
      }))
    );
    return rows.map((row, i) => ({
      ...row,
      teethTrend: teethTrend[i],
    }));
  }, [mergedMetrics]);

  return (
    <PageLayout
      header={
        <PageHeader
          page="analytics"
          title="Analytics"
          actions={
            <>
              <DropdownSelect
                value={rangeSelection}
                menuClassName="min-w-full"
                onChange={(next) => {
                  setRangeSelection(next);
                  saveAnalyticsRange(next);
                }}
                options={[
                  { value: "7d", label: "7 days" },
                  { value: "30d", label: "30 days" },
                  { value: "3m", label: "3 months" },
                  { value: "6m", label: "6 months" },
                  { value: "1y", label: "1 year" },
                  { value: "5y", label: "5 years" },
                  { value: "all", label: "All Time" },
                ]}
              />
            </>
          }
        />
      }
      contentClassName="space-y-8"
    >
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionHeader
            kind="weight"
            className="mb-0 text-sm font-medium text-slate-400"
          >
            Weight
          </SectionHeader>
          <AnalyticsChartToolbar>
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_TREND_ICON}
              label="Show trend"
              pressed={chartToggles.weight.trend}
              onToggle={() =>
                updateChartToggle("weight", "trend", !chartToggles.weight.trend)
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_AVERAGE_ICON}
              label="Show average"
              pressed={chartToggles.weight.average}
              onToggle={() =>
                updateChartToggle(
                  "weight",
                  "average",
                  !chartToggles.weight.average
                )
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_GOAL_ICON}
              label="Show goal"
              pressed={chartToggles.weight.goal}
              onToggle={() =>
                updateChartToggle("weight", "goal", !chartToggles.weight.goal)
              }
            />
          </AnalyticsChartToolbar>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={weightChartData} margin={CHART_MARGIN}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis {...CHART_DATE_AXIS} />
            <YAxis
              {...CHART_Y_AXIS}
              type="number"
              scale="linear"
              niceTicks="none"
              domain={weightAxis.domain}
              ticks={weightAxis.ticks}
              tickFormatter={formatWeightAxisTick}
            />
            <Tooltip
              {...analyticsChartTooltipProps}
              content={(props) => (
                <WeightChartTooltip
                  {...props}
                  showAverage={chartToggles.weight.average}
                  periodAvg={weightPeriodAvg}
                />
              )}
            />
            {chartToggles.weight.trend && (
              <Line
                {...ANALYTICS_TREND_LINE_PROPS}
                dataKey="weight"
                name="Weight trend"
              />
            )}
            <Scatter
              dataKey="weightLogged"
              name="Weight (kg)"
              isAnimationActive={false}
              legendType="none"
              shape={loggedWeightScatterShape}
              activeShape={loggedWeightScatterActiveShape}
            />
            {chartToggles.weight.average && weightPeriodAvg != null && (
              <PeriodAverageReferenceLine value={weightPeriodAvg} />
            )}
            {chartToggles.weight.goal &&
              settings?.targetWeight != null &&
              settings.targetWeight > 0 && (
              <GoalReferenceLine value={settings.targetWeight} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionHeader
            kind="calories"
            className="mb-0 text-sm font-medium text-slate-400"
          >
            Calories Consumed
          </SectionHeader>
          <AnalyticsChartToolbar>
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_TREND_ICON}
              label="Show trend"
              pressed={chartToggles.calories.trend}
              onToggle={() =>
                updateChartToggle(
                  "calories",
                  "trend",
                  !chartToggles.calories.trend
                )
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_AVERAGE_ICON}
              label="Show average"
              pressed={chartToggles.calories.average}
              onToggle={() =>
                updateChartToggle(
                  "calories",
                  "average",
                  !chartToggles.calories.average
                )
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_GOAL_ICON}
              label="Show goal"
              pressed={chartToggles.calories.goal}
              onToggle={() =>
                updateChartToggle(
                  "calories",
                  "goal",
                  !chartToggles.calories.goal
                )
              }
            />
          </AnalyticsChartToolbar>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis {...CHART_DATE_AXIS} />
            <YAxis
              {...CHART_Y_AXIS}
              type="number"
              scale="linear"
              niceTicks="none"
              domain={[0, caloriesAxis.axisMax]}
              ticks={caloriesAxis.ticks}
              allowDecimals={false}
              tickFormatter={formatCaloriesTick}
            />
            <Tooltip
              {...analyticsChartTooltipProps}
              content={(props) => {
                const point = props.payload?.[0]?.payload as
                  | (typeof chartData)[number]
                  | undefined;
                return (
                  <AnalyticsTooltipContent
                    active={props.active}
                    payload={props.payload}
                    visible={point?.hasCalories === true}
                  >
                    {({ date }) => (
                      <>
                        <AnalyticsTooltipDate>{date}</AnalyticsTooltipDate>
                        <AnalyticsTooltipPrimary
                          className={calorieTooltipValueClass(
                            point!.calories,
                            settings
                          )}
                        >
                          {Math.round(point!.calories).toLocaleString()} kcal
                        </AnalyticsTooltipPrimary>
                        {chartToggles.calories.average &&
                          caloriesPeriodAvg != null && (
                          <AnalyticsTooltipSecondary>
                            Period avg:{" "}
                            {Math.round(caloriesPeriodAvg).toLocaleString()}{" "}
                            kcal
                          </AnalyticsTooltipSecondary>
                        )}
                      </>
                    )}
                  </AnalyticsTooltipContent>
                );
              }}
            />
            <Bar
              dataKey="calories"
              name="Daily kcal"
              maxBarSize={BAR_MAX_SIZE}
              radius={chartToggles.calories.goal ? undefined : BAR_TOP_RADIUS}
              shape={calorieBarShape}
              fill={chartToggles.calories.goal ? "transparent" : ACCENT_STROKE}
              fillOpacity={
                chartToggles.calories.goal ? undefined : BAR_FILL_OPACITY
              }
            >
              {!chartToggles.calories.goal &&
                chartData.map((entry, index) => (
                  <Cell
                    key={`calories-${index}`}
                    fill={entry.hasCalories ? ACCENT_STROKE : "transparent"}
                  />
                ))}
            </Bar>
            {chartToggles.calories.trend && (
              <Line
                {...ANALYTICS_TREND_LINE_PROPS}
                dataKey="caloriesTrend"
                name="Calorie trend"
              />
            )}
            {chartToggles.calories.average && caloriesPeriodAvg != null && (
              <PeriodAverageReferenceLine value={caloriesPeriodAvg} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionHeader
            kind="calorieDeficit"
            className="mb-0 text-sm font-medium text-slate-400"
          >
            Calorie Deficit
          </SectionHeader>
          <AnalyticsChartToolbar>
            <DropdownSelect
              value={deficitMetric}
              className="w-auto"
              triggerClassName="h-9 px-2"
              onChange={setDeficitMetric}
              options={[
                { value: "kcal", label: "Calories" },
                { value: "kg", label: "Kgs" },
              ]}
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_TREND_ICON}
              label="Show trend"
              pressed={chartToggles.deficit.trend}
              onToggle={() =>
                updateChartToggle(
                  "deficit",
                  "trend",
                  !chartToggles.deficit.trend
                )
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_AVERAGE_ICON}
              label="Show average"
              pressed={chartToggles.deficit.average}
              onToggle={() =>
                updateChartToggle(
                  "deficit",
                  "average",
                  !chartToggles.deficit.average
                )
              }
            />
          </AnalyticsChartToolbar>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={deficitChartData} margin={CHART_MARGIN}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis {...CHART_DATE_AXIS} />
            <YAxis
              {...CHART_Y_AXIS}
              reversed={deficitMetric === "kg"}
              domain={deficitMetric === "kg" ? ["auto", "auto"] : undefined}
              tickFormatter={(v: number) => {
                if (deficitMetric === "kg") {
                  if (Math.abs(v) < 0.0005) return "0";
                  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
                }
                return v >= 1000
                  ? `${Math.round(v / 1000)}k`
                  : String(v);
              }}
            />
            <Tooltip
              {...analyticsChartTooltipProps}
              content={(props) => {
                const point = props.payload?.[0]?.payload as
                  | (typeof deficitChartData)[number]
                  | undefined;
                if (deficitMetric === "kg") {
                  const label =
                    point?.estimatedKgChange != null
                      ? formatKgChangeShort(point.estimatedKgChange)
                      : null;
                  return (
                    <AnalyticsTooltipContent
                      active={props.active}
                      payload={props.payload}
                      visible={point?.hasEstimatedKg === true && label != null}
                    >
                      {({ date }) => (
                        <>
                          <AnalyticsTooltipDate>{date}</AnalyticsTooltipDate>
                          <AnalyticsTooltipPrimary
                            className={
                              (point!.estimatedKgChange ?? 0) > 0
                                ? "text-emerald-400"
                                : (point!.estimatedKgChange ?? 0) < 0
                                  ? "text-amber-400"
                                  : "text-accent"
                            }
                          >
                            {label}
                          </AnalyticsTooltipPrimary>
                          {chartToggles.deficit.average &&
                            kgPeriodAvg != null &&
                            formatKgChangeShort(kgPeriodAvg) != null && (
                            <AnalyticsTooltipSecondary>
                              Period avg: {formatKgChangeShort(kgPeriodAvg)}
                            </AnalyticsTooltipSecondary>
                          )}
                        </>
                      )}
                    </AnalyticsTooltipContent>
                  );
                }
                const periodAvg = deficitPeriodAvg;
                return (
                  <AnalyticsTooltipContent
                    active={props.active}
                    payload={props.payload}
                    visible={point?.hasDeficit === true}
                  >
                    {({ date }) => (
                      <>
                        <AnalyticsTooltipDate>{date}</AnalyticsTooltipDate>
                        {point!.hasDeficit && (
                          <AnalyticsTooltipPrimary
                            className={
                              point!.deficit > 0
                                ? "text-emerald-400"
                                : point!.deficit < 0
                                  ? "text-amber-400"
                                  : "text-accent"
                            }
                          >
                            {formatDeficit(point!.deficit)}
                          </AnalyticsTooltipPrimary>
                        )}
                        {chartToggles.deficit.average &&
                          periodAvg != null && (
                          <AnalyticsTooltipSecondary>
                            Period avg:{" "}
                            {formatDeficit(Math.round(periodAvg))}
                          </AnalyticsTooltipSecondary>
                        )}
                      </>
                    )}
                  </AnalyticsTooltipContent>
                );
              }}
            />
            {deficitMetric === "kcal" && (
              <Bar
                dataKey="deficit"
                name="Deficit (kcal)"
                maxBarSize={BAR_MAX_SIZE}
                radius={BAR_TOP_RADIUS}
                fillOpacity={BAR_FILL_OPACITY}
              >
                {deficitChartData.map((entry, index) => (
                  <Cell
                    key={`deficit-kcal-${index}`}
                    fill={
                      !entry.hasDeficit
                        ? "transparent"
                        : entry.deficit > 0
                          ? "rgba(52, 211, 153, 0.5)"
                          : entry.deficit < 0
                            ? "rgba(251, 191, 36, 0.5)"
                            : "transparent"
                    }
                  />
                ))}
              </Bar>
            )}
            {deficitMetric === "kcal" && chartToggles.deficit.trend && (
              <Line
                {...ANALYTICS_TREND_LINE_PROPS}
                dataKey="deficitTrend"
                name="Deficit trend"
              />
            )}
            {deficitMetric === "kg" && (
              <Bar
                dataKey="kgBar"
                name="Est. change (kg)"
                maxBarSize={BAR_MAX_SIZE}
                radius={BAR_TOP_RADIUS}
                fillOpacity={BAR_FILL_OPACITY}
              >
                {deficitChartData.map((entry, index) => (
                  <Cell
                    key={`deficit-kg-${index}`}
                    fill={
                      !entry.hasEstimatedKg
                        ? "transparent"
                        : entry.kgBar < 0
                          ? "rgba(52, 211, 153, 0.5)"
                          : entry.kgBar > 0
                            ? "rgba(251, 191, 36, 0.5)"
                            : "transparent"
                    }
                  />
                ))}
              </Bar>
            )}
            {deficitMetric === "kg" && chartToggles.deficit.trend && (
              <Line
                {...ANALYTICS_TREND_LINE_PROPS}
                dataKey="kg"
                name="Kg trend"
              />
            )}
            {chartToggles.deficit.average &&
              deficitMetric === "kcal" &&
              deficitPeriodAvg != null && (
                <PeriodAverageReferenceLine value={deficitPeriodAvg} />
              )}
            {chartToggles.deficit.average &&
              deficitMetric === "kg" &&
              kgPeriodAvgChart != null && (
                <PeriodAverageReferenceLine value={kgPeriodAvgChart} />
              )}
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionHeader
            kind="steps"
            className="mb-0 text-sm font-medium text-slate-400"
          >
            Steps
          </SectionHeader>
          <AnalyticsChartToolbar>
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_TREND_ICON}
              label="Show trend"
              pressed={chartToggles.steps.trend}
              onToggle={() =>
                updateChartToggle("steps", "trend", !chartToggles.steps.trend)
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_AVERAGE_ICON}
              label="Show average"
              pressed={chartToggles.steps.average}
              onToggle={() =>
                updateChartToggle(
                  "steps",
                  "average",
                  !chartToggles.steps.average
                )
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_GOAL_ICON}
              label="Show goal"
              pressed={chartToggles.steps.goal}
              onToggle={() =>
                updateChartToggle("steps", "goal", !chartToggles.steps.goal)
              }
            />
          </AnalyticsChartToolbar>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis {...CHART_DATE_AXIS} />
            <YAxis
              {...CHART_Y_AXIS}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
              }
            />
            <Tooltip
              {...analyticsChartTooltipProps}
              content={(props) => {
                const point = props.payload?.[0]?.payload as
                  | (typeof chartData)[number]
                  | undefined;
                return (
                  <AnalyticsTooltipContent
                    active={props.active}
                    payload={props.payload}
                    visible={point?.hasSteps === true}
                  >
                    {({ date }) => (
                      <>
                        <AnalyticsTooltipDate>{date}</AnalyticsTooltipDate>
                        <AnalyticsTooltipPrimary>
                          {Math.round(point!.steps).toLocaleString()} steps
                        </AnalyticsTooltipPrimary>
                        {chartToggles.steps.average &&
                          stepsPeriodAvg != null && (
                          <AnalyticsTooltipSecondary>
                            Period avg:{" "}
                            {Math.round(stepsPeriodAvg).toLocaleString()}{" "}
                            steps
                          </AnalyticsTooltipSecondary>
                        )}
                      </>
                    )}
                  </AnalyticsTooltipContent>
                );
              }}
            />
            <Bar
              dataKey="steps"
              name="Steps"
              maxBarSize={BAR_MAX_SIZE}
              radius={BAR_TOP_RADIUS}
              fillOpacity={BAR_FILL_OPACITY}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`steps-${index}`}
                  fill={entry.hasSteps ? ACCENT_STROKE : "transparent"}
                />
              ))}
            </Bar>
            {chartToggles.steps.trend && (
              <Line
                {...ANALYTICS_TREND_LINE_PROPS}
                dataKey="stepsTrend"
                name="Steps trend"
              />
            )}
            {chartToggles.steps.average && stepsPeriodAvg != null && (
              <PeriodAverageReferenceLine value={stepsPeriodAvg} />
            )}
            {chartToggles.steps.goal &&
              settings &&
              settings.dailyStepsGoal > 0 && (
              <GoalReferenceLine value={settings.dailyStepsGoal} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionHeader
            kind="water"
            className="mb-0 text-sm font-medium text-slate-400"
          >
            Water
          </SectionHeader>
          <AnalyticsChartToolbar>
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_TREND_ICON}
              label="Show trend"
              pressed={chartToggles.water.trend}
              onToggle={() =>
                updateChartToggle("water", "trend", !chartToggles.water.trend)
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_AVERAGE_ICON}
              label="Show average"
              pressed={chartToggles.water.average}
              onToggle={() =>
                updateChartToggle(
                  "water",
                  "average",
                  !chartToggles.water.average
                )
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_GOAL_ICON}
              label="Show goal"
              pressed={chartToggles.water.goal}
              onToggle={() =>
                updateChartToggle("water", "goal", !chartToggles.water.goal)
              }
            />
          </AnalyticsChartToolbar>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={waterChartData} margin={CHART_MARGIN}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis {...CHART_DATE_AXIS} />
            <YAxis
              {...CHART_Y_AXIS}
              tickFormatter={formatWaterAxisTick}
            />
            <Tooltip
              {...analyticsChartTooltipProps}
              content={(props) => {
                const point = props.payload?.[0]?.payload as
                  | (typeof waterChartData)[number]
                  | undefined;
                return (
                  <AnalyticsTooltipContent
                    active={props.active}
                    payload={props.payload}
                    visible={point?.hasWater === true}
                  >
                    {({ date }) => (
                      <>
                        <AnalyticsTooltipDate>{date}</AnalyticsTooltipDate>
                        <AnalyticsTooltipPrimary>
                          {formatWaterMl(point!.water)}
                        </AnalyticsTooltipPrimary>
                        {settings && (
                          <AnalyticsTooltipSecondary>
                            Goal: {formatWaterMl(settings.dailyWaterGoalMl)}
                          </AnalyticsTooltipSecondary>
                        )}
                        {chartToggles.water.average &&
                          waterPeriodAvg != null && (
                          <AnalyticsTooltipSecondary>
                            Period avg: {formatWaterMl(Math.round(waterPeriodAvg))}
                          </AnalyticsTooltipSecondary>
                        )}
                      </>
                    )}
                  </AnalyticsTooltipContent>
                );
              }}
            />
            <Bar
              dataKey="water"
              name="Water"
              maxBarSize={BAR_MAX_SIZE}
              radius={BAR_TOP_RADIUS}
              fillOpacity={BAR_FILL_OPACITY}
            >
              {waterChartData.map((entry, index) => (
                <Cell
                  key={`water-${index}`}
                  fill={entry.hasWater ? WATER_BAR_FILL : "transparent"}
                />
              ))}
            </Bar>
            {chartToggles.water.trend && (
              <Line
                {...ANALYTICS_TREND_LINE_PROPS}
                dataKey="waterTrend"
                name="Water trend"
              />
            )}
            {chartToggles.water.average && waterPeriodAvg != null && (
              <PeriodAverageReferenceLine value={waterPeriodAvg} />
            )}
            {chartToggles.water.goal &&
              settings?.dailyWaterGoalMl != null &&
              settings.dailyWaterGoalMl > 0 && (
              <GoalReferenceLine value={settings.dailyWaterGoalMl} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionHeader
            kind="teeth"
            className="mb-0 text-sm font-medium text-slate-400"
          >
            Teeth brushing
          </SectionHeader>
          <AnalyticsChartToolbar>
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_TREND_ICON}
              label="Show trend"
              pressed={chartToggles.teeth.trend}
              onToggle={() =>
                updateChartToggle("teeth", "trend", !chartToggles.teeth.trend)
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_AVERAGE_ICON}
              label="Show average"
              pressed={chartToggles.teeth.average}
              onToggle={() =>
                updateChartToggle(
                  "teeth",
                  "average",
                  !chartToggles.teeth.average
                )
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_GOAL_ICON}
              label="Show goal"
              pressed={chartToggles.teeth.goal}
              onToggle={() =>
                updateChartToggle("teeth", "goal", !chartToggles.teeth.goal)
              }
            />
          </AnalyticsChartToolbar>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={teethChartData} margin={CHART_MARGIN}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis {...CHART_DATE_AXIS} />
            <YAxis {...CHART_Y_AXIS} allowDecimals={false} />
            <Tooltip
              {...analyticsChartTooltipProps}
              content={(props) => {
                const point = props.payload?.[0]?.payload as
                  | (typeof teethChartData)[number]
                  | undefined;
                return (
                  <AnalyticsTooltipContent
                    active={props.active}
                    payload={props.payload}
                    visible={point?.hasTeeth === true}
                  >
                    {({ date }) => (
                      <>
                        <AnalyticsTooltipDate>{date}</AnalyticsTooltipDate>
                        <AnalyticsTooltipPrimary>
                          {formatTeethCount(point!.teeth)}
                        </AnalyticsTooltipPrimary>
                        {settings && (
                          <AnalyticsTooltipSecondary>
                            Goal:{" "}
                            {formatTeethCount(settings.dailyTeethBrushingsGoal)}
                          </AnalyticsTooltipSecondary>
                        )}
                        {chartToggles.teeth.average &&
                          teethPeriodAvg != null && (
                          <AnalyticsTooltipSecondary>
                            Period avg:{" "}
                            {formatTeethCount(
                              Math.round(teethPeriodAvg * 10) / 10
                            )}
                          </AnalyticsTooltipSecondary>
                        )}
                      </>
                    )}
                  </AnalyticsTooltipContent>
                );
              }}
            />
            <Bar
              dataKey="teeth"
              name="Teeth brushing"
              maxBarSize={BAR_MAX_SIZE}
              radius={BAR_TOP_RADIUS}
              fillOpacity={BAR_FILL_OPACITY}
            >
              {teethChartData.map((entry, index) => (
                <Cell
                  key={`teeth-${index}`}
                  fill={entry.hasTeeth ? TEETH_BAR_FILL : "transparent"}
                />
              ))}
            </Bar>
            {chartToggles.teeth.trend && (
              <Line
                {...ANALYTICS_TREND_LINE_PROPS}
                dataKey="teethTrend"
                name="Teeth trend"
              />
            )}
            {chartToggles.teeth.average && teethPeriodAvg != null && (
              <PeriodAverageReferenceLine value={teethPeriodAvg} />
            )}
            {chartToggles.teeth.goal &&
              settings?.dailyTeethBrushingsGoal != null &&
              settings.dailyTeethBrushingsGoal > 0 && (
              <GoalReferenceLine value={settings.dailyTeethBrushingsGoal} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionHeader
            kind="workout"
            className="mb-0 text-sm font-medium text-slate-400"
          >
            Workouts
          </SectionHeader>
          <AnalyticsChartToolbar>
            <DropdownSelect
              value={workoutMetric}
              className="w-auto"
              triggerClassName="h-9 px-2"
              onChange={setWorkoutMetric}
              options={[
                { value: "durationMin", label: "Duration" },
                { value: "calories", label: "Calories" },
              ]}
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_TREND_ICON}
              label="Show trend"
              pressed={chartToggles.workouts.trend}
              onToggle={() =>
                updateChartToggle(
                  "workouts",
                  "trend",
                  !chartToggles.workouts.trend
                )
              }
            />
            <AnalyticsChartIconToggle
              iconClass={ANALYTICS_AVERAGE_ICON}
              label="Show average"
              pressed={chartToggles.workouts.average}
              onToggle={() =>
                updateChartToggle(
                  "workouts",
                  "average",
                  !chartToggles.workouts.average
                )
              }
            />
          </AnalyticsChartToolbar>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={workoutChartData} margin={CHART_MARGIN}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis {...CHART_DATE_AXIS} />
            <YAxis {...CHART_Y_AXIS} />
            <Tooltip
              {...analyticsChartTooltipProps}
              content={(props) => {
                const point = props.payload?.[0]?.payload as
                  | (typeof workoutChartData)[number]
                  | undefined;
                const show =
                  point?.workedOut === true &&
                  point.value != null &&
                  point.value > 0;
                const intensityLabel = point
                  ? point.intensity.charAt(0).toUpperCase() +
                    point.intensity.slice(1)
                  : "";
                const valueLabel =
                  workoutMetric === "durationMin"
                    ? `${point?.value} min`
                    : `${point?.value?.toLocaleString()} kcal`;
                return (
                  <AnalyticsTooltipContent
                    active={props.active}
                    payload={props.payload}
                    visible={show}
                  >
                    {({ date }) => (
                      <>
                        <AnalyticsTooltipDate>{date}</AnalyticsTooltipDate>
                        <AnalyticsTooltipPrimary>
                          {valueLabel} · {intensityLabel}
                        </AnalyticsTooltipPrimary>
                        {chartToggles.workouts.average &&
                          workoutPeriodAvg != null && (
                          <AnalyticsTooltipSecondary>
                            Period avg:{" "}
                            {workoutMetric === "durationMin"
                              ? `${Math.round(workoutPeriodAvg)} min`
                              : `${Math.round(workoutPeriodAvg).toLocaleString()} kcal`}
                          </AnalyticsTooltipSecondary>
                        )}
                      </>
                    )}
                  </AnalyticsTooltipContent>
                );
              }}
            />
            <Bar
              dataKey="value"
              name={
                workoutMetric === "durationMin" ? "Duration (min)" : "Calories"
              }
              maxBarSize={BAR_MAX_SIZE}
              radius={BAR_TOP_RADIUS}
              fillOpacity={BAR_FILL_OPACITY}
            >
              {workoutChartData.map((entry, index) => (
                <Cell
                  key={`workout-${index}`}
                  fill={
                    entry.workedOut && entry.value > 0
                      ? WORKOUT_INTENSITY_COLORS[entry.intensity]
                      : "transparent"
                  }
                />
              ))}
            </Bar>
            {chartToggles.workouts.trend && (
              <Line
                {...ANALYTICS_TREND_LINE_PROPS}
                dataKey="valueTrend"
                name="Workout trend"
              />
            )}
            {chartToggles.workouts.average && workoutPeriodAvg != null && (
              <PeriodAverageReferenceLine value={workoutPeriodAvg} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </section>
    </PageLayout>
  );
}
