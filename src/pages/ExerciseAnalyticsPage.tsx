import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DeleteIconButton } from "../components/DeleteIconButton";
import { NumberInput } from "../components/NumberInput";
import { PageHeader, pageHeaderActionButtonClass } from "../components/PageHeader";
import { PageLayout } from "../components/PageLayout";
import { ProgressCharts } from "../components/ProgressCharts";
import { SectionHeader } from "../components/SectionHeader";
import { api } from "../lib/api";
import { todayString } from "../lib/dates";
import {
  amountMetricLabel,
  bestAmount,
  exerciseLogsToChartPoints,
  formatCaloriesBurned,
  formatExerciseSetLine,
  formatLoggedAmount,
  improvementPercent,
  latestSessionHighlight,
  sessionMaxWeight,
  sessionTotalAmount,
  showWeightProgress,
} from "../lib/progressAnalytics";
import { formatWorkoutTemplateSummary, normalizeWorkoutAmountUnit } from "../lib/workoutLibrary";
import type { ExerciseProgress } from "../types";

type SetDraft = {
  amount: string;
  weightKg: string;
};

function defaultSetDraft(templateAmount: number): SetDraft {
  return {
    amount: String(templateAmount),
    weightKg: "",
  };
}

export function ExerciseAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const exerciseId = id ? parseInt(id, 10) : NaN;

  const [progress, setProgress] = useState<ExerciseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [logDate, setLogDate] = useState(todayString());
  const [logSets, setLogSets] = useState<SetDraft[]>([defaultSetDraft(1)]);
  const [logCalories, setLogCalories] = useState("");
  const [logError, setLogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(exerciseId)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getExerciseProgress(exerciseId);
      setProgress(data);
      setLogSets([defaultSetDraft(data.exercise.amount)]);
    } catch (e) {
      setError(String(e));
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const exercise = progress?.exercise;
  const unit = exercise
    ? normalizeWorkoutAmountUnit(exercise.amountUnit)
    : "reps";
  const logs = progress?.logs ?? [];
  const chartPoints = useMemo(() => exerciseLogsToChartPoints(logs), [logs]);
  const showWeight = exercise ? showWeightProgress(unit, logs) : false;

  const stats = useMemo(() => {
    if (logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) => a.dayDate.localeCompare(b.dayDate));
    const firstTotal = sessionTotalAmount(sorted[0]);
    const latestTotal = sessionTotalAmount(sorted[sorted.length - 1]);
    return {
      sessions: logs.length,
      best: bestAmount(logs, unit),
      latest: latestSessionHighlight(logs, unit),
      improvement: improvementPercent(firstTotal, latestTotal),
    };
  }, [logs, unit]);

  const submitLog = async () => {
    if (!exercise) return;
    const sets = logSets.map((row, index) => {
      const amount = parseFloat(row.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(`Set ${index + 1}: enter a valid ${amountMetricLabel(unit).toLowerCase()}`);
      }
      const weightRaw = row.weightKg.trim();
      const weightKg = weightRaw ? parseFloat(weightRaw) : null;
      if (weightKg != null && (!Number.isFinite(weightKg) || weightKg < 0)) {
        throw new Error(`Set ${index + 1}: enter valid weight`);
      }
      return { amount, weightKg };
    });

    const caloriesRaw = logCalories.trim();
    const calories = caloriesRaw
      ? parseFloat(caloriesRaw)
      : exercise.calories > 0
        ? exercise.calories
        : null;
    if (calories != null && (!Number.isFinite(calories) || calories < 0)) {
      setLogError("Enter valid calories");
      return;
    }

    try {
      const next = await api.addExerciseLog(exercise.id, {
        dayDate: logDate,
        calories,
        sets,
      });
      setProgress(next);
      setLogError(null);
      setLogSets([defaultSetDraft(exercise.amount)]);
      setLogCalories("");
    } catch (e) {
      setLogError(String(e));
    }
  };

  const removeLog = async (logId: number) => {
    try {
      await api.deleteExerciseLog(logId);
      void load();
    } catch (e) {
      setError(String(e));
    }
  };

  const addSetRow = () => {
    setLogSets((prev) => [...prev, defaultSetDraft(exercise?.amount ?? 1)]);
  };

  const removeSetRow = (index: number) => {
    setLogSets((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const updateSetRow = (index: number, patch: Partial<SetDraft>) => {
    setLogSets((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  if (!Number.isFinite(exerciseId)) {
    return (
      <PageLayout>
        <p className="text-sm text-red-400">Invalid exercise.</p>
      </PageLayout>
    );
  }

  const bestStatLabel =
    unit === "reps" && logs.some((l) => sessionMaxWeight(l) != null)
      ? "Best weight"
      : `Best ${amountMetricLabel(unit).toLowerCase()}`;

  const bestStatValue =
    stats?.best != null
      ? unit === "reps" && logs.some((l) => sessionMaxWeight(l) != null)
        ? `${stats.best} kg`
        : formatLoggedAmount(stats.best, unit)
      : "—";

  return (
    <PageLayout
      header={
        <PageHeader
          title={exercise?.name ?? "Exercise progress"}
          page="workouts"
          actions={
            <Link to="/workouts" className={pageHeaderActionButtonClass}>
              Back
            </Link>
          }
        />
      }
    >
      {loading && (
        <p className="text-sm text-slate-500">Loading progress…</p>
      )}
      {error && !loading && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {exercise && !loading && (
        <>
          <p className="text-sm text-slate-500">
            Library target: {formatWorkoutTemplateSummary(exercise)}
          </p>

          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Sessions" value={String(stats.sessions)} />
              <StatCard label={bestStatLabel} value={bestStatValue} />
              <StatCard label="Latest session" value={stats.latest ?? "—"} />
              <StatCard
                label="Volume change"
                value={
                  stats.improvement != null
                    ? `${stats.improvement >= 0 ? "+" : ""}${stats.improvement}%`
                    : "—"
                }
              />
            </div>
          )}

          <SectionHeader kind="workout" className="text-sm font-medium">
            Progress over time
          </SectionHeader>
          <p className="mb-2 text-xs text-slate-500">
            {unit === "reps"
              ? "Charts use total reps per session and heaviest weight per session."
              : `Charts use total ${amountMetricLabel(unit).toLowerCase()} per session.`}
          </p>
          <ProgressCharts
            points={chartPoints}
            amountUnit={unit}
            showWeight={showWeight}
          />

          <div className="rounded-xl border border-accent-deep-50 bg-slate-900/80 p-4">
            <SectionHeader kind="workout" className="mb-1 text-sm font-medium">
              Log session
            </SectionHeader>
            <p className="mb-3 text-xs text-slate-500">
              Add each set — weight often increases as you approach failure.
            </p>
            <div className="mb-4 max-w-xs">
              <label className="mb-1 block text-xs text-slate-500">Date</label>
              <input
                type="date"
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                value={logDate}
                max={todayString()}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {logSets.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                >
                  <span className="w-12 shrink-0 pb-2 text-xs font-medium text-slate-500">
                    Set {index + 1}
                  </span>
                  <div className="min-w-[5rem] flex-1">
                    <label className="mb-1 block text-xs text-slate-500">
                      {amountMetricLabel(unit)}
                    </label>
                    <NumberInput
                      min={0}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm"
                      value={row.amount}
                      onChange={(e) =>
                        updateSetRow(index, { amount: e.target.value })
                      }
                    />
                  </div>
                  {unit === "reps" && (
                    <div className="min-w-[5rem] flex-1">
                      <label className="mb-1 block text-xs text-slate-500">
                        Weight (kg)
                      </label>
                      <NumberInput
                        min={0}
                        className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm"
                        value={row.weightKg}
                        placeholder="Optional"
                        onChange={(e) =>
                          updateSetRow(index, { weightKg: e.target.value })
                        }
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={logSets.length <= 1}
                    onClick={() => removeSetRow(index)}
                    className="mb-0.5 cursor-pointer rounded-lg px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={`Remove set ${index + 1}`}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addSetRow}
              className="mt-2 cursor-pointer text-sm text-accent transition-colors hover:text-accent-hover"
            >
              + Add set
            </button>

            <div className="mt-4 max-w-xs">
              <label className="mb-1 block text-xs text-slate-500">
                Kcal burned (session)
              </label>
              <NumberInput
                min={0}
                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-2 text-sm"
                value={logCalories}
                placeholder={
                  exercise.calories > 0 ? String(exercise.calories) : ""
                }
                onChange={(e) => setLogCalories(e.target.value)}
              />
            </div>

            {logError && (
              <p className="mt-2 text-xs text-red-400">{logError}</p>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void submitLog()}
                className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm transition-colors hover:bg-accent-hover"
              >
                Save session
              </button>
            </div>
          </div>

          {logs.length > 0 && (
            <div>
              <SectionHeader kind="workout" className="mb-3 text-sm font-medium">
                History
              </SectionHeader>
              <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
                {[...logs].reverse().map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-200">{log.dayDate}</p>
                      <p className="text-xs text-slate-500">
                        {formatCaloriesBurned(log.calories)}
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {log.sets.map((set, i) => (
                          <li key={set.id} className="text-xs text-slate-600">
                            {formatExerciseSetLine(set, log.amountUnit, i)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <DeleteIconButton
                      onClick={() => void removeLog(log.id)}
                      aria-label={`Delete session on ${log.dayDate}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {!loading && !exercise && !error && (
        <Link to="/workouts" className={pageHeaderActionButtonClass}>
          Back
        </Link>
      )}
    </PageLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
