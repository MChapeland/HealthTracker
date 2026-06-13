import type { ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProgressChartPoint } from "../lib/progressAnalytics";
import type { WorkoutAmountUnit } from "../types";
import { amountMetricLabel } from "../lib/progressAnalytics";

const CHART_MARGIN = { top: 12, right: 12, left: 0, bottom: 0 };
const AXIS_TICK = { fontSize: 10, fill: "#64748b" };

type Props = {
  points: ProgressChartPoint[];
  amountUnit: WorkoutAmountUnit;
  showWeight: boolean;
};

export function ProgressCharts({ points, amountUnit, showWeight }: Props) {
  if (points.length === 0) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center text-sm text-slate-500">
        Log your first session below to start tracking progress.
      </p>
    );
  }

  const amountLabel = amountMetricLabel(amountUnit);
  const hasCalories = points.some((p) => p.calories != null && p.calories > 0);
  const hasWeight = showWeight && points.some((p) => p.weightKg != null && p.weightKg > 0);

  return (
    <div className="space-y-6">
      <ChartBlock title={amountLabel} empty={points.length === 0}>
        <LineChart data={points} margin={CHART_MARGIN}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            name={amountLabel}
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ r: 3, fill: "#60a5fa" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ChartBlock>

      {hasCalories && (
        <ChartBlock title="Kcal burned" empty={false}>
          <LineChart data={points} margin={CHART_MARGIN}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="calories"
              name="Kcal burned"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ r: 3, fill: "#34d399" }}
            />
          </LineChart>
        </ChartBlock>
      )}

      {hasWeight && (
        <ChartBlock title="Weight (kg)" empty={false}>
          <LineChart
            data={points.filter((p) => p.weightKg != null && p.weightKg > 0)}
            margin={CHART_MARGIN}
          >
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="weightKg"
              name="Weight"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={{ r: 3, fill: "#fbbf24" }}
            />
          </LineChart>
        </ChartBlock>
      )}
    </div>
  );
}

function ChartBlock({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty: boolean;
}) {
  if (empty) return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="mb-3 text-sm font-medium text-slate-300">{title}</h3>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
