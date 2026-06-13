import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DeleteIconButton } from "../components/DeleteIconButton";
import { NumberInput } from "../components/NumberInput";
import { PageHeader, pageHeaderActionButtonClass } from "../components/PageHeader";
import { PageLayout } from "../components/PageLayout";
import { ProgressCharts } from "../components/ProgressCharts";
import { SectionHeader } from "../components/SectionHeader";
import { api } from "../lib/api";
import { todayString, formatShortDate } from "../lib/dates";
import {
  amountMetricLabel,
  entriesForExercise,
  formatCaloriesBurned,
  sessionCaloriesPoints,
  summarizeEntry,
} from "../lib/progressAnalytics";
import { formatRoutineSummary } from "../lib/routineLibrary";
import { normalizeWorkoutAmountUnit } from "../lib/workoutLibrary";
import type { RoutineLogExerciseInput, RoutineProgress } from "../types";

export function RoutineAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const routineId = id ? parseInt(id, 10) : NaN;

  const [progress, setProgress] = useState<RoutineProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [logDate, setLogDate] = useState(todayString());
  const [logEntries, setLogEntries] = useState<
    Record<number, { amount: string; calories: string; weightKg: string }>
  >({});
  const [logError, setLogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(routineId)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRoutineProgress(routineId);
      setProgress(data);
      const defaults: Record<
        number,
        { amount: string; calories: string; weightKg: string }
      > = {};
      for (const ex of data.routine.exercises) {
        defaults[ex.exerciseId] = {
          amount: String(ex.amount),
          calories: ex.calories > 0 ? String(ex.calories) : "",
          weightKg: "",
        };
      }
      setLogEntries(defaults);
    } catch (e) {
      setError(String(e));
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [routineId]);

  useEffect(() => {
    void load();
  }, [load]);

  const routine = progress?.routine;
  const sessions = progress?.sessions ?? [];
  const caloriesChart = useMemo(
    () => sessionCaloriesPoints(sessions),
    [sessions]
  );

  const submitLog = async () => {
    if (!routine) return;
    const entries: RoutineLogExerciseInput[] = [];
    for (const ex of routine.exercises) {
      const row = logEntries[ex.exerciseId];
      if (!row) continue;
      const amount = parseFloat(row.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setLogError(`Enter a valid amount for ${ex.name}`);
        return;
      }
      const caloriesRaw = row.calories.trim();
      const calories = caloriesRaw
        ? parseFloat(caloriesRaw)
        : ex.calories > 0
          ? ex.calories
          : null;
      if (calories != null && (!Number.isFinite(calories) || calories < 0)) {
        setLogError("Enter valid calories");
        return;
      }
      const weightRaw = row.weightKg.trim();
      const weightKg = weightRaw ? parseFloat(weightRaw) : null;
      if (weightKg != null && (!Number.isFinite(weightKg) || weightKg < 0)) {
        setLogError("Enter valid weight");
        return;
      }
      entries.push({
        exerciseId: ex.exerciseId,
        amount,
        calories,
        weightKg,
      });
    }
    if (entries.length === 0) {
      setLogError("Nothing to log");
      return;
    }
    try {
      const next = await api.addRoutineLog(routine.id, logDate, entries);
      setProgress(next);
      setLogError(null);
      void load();
    } catch (e) {
      setLogError(String(e));
    }
  };

  const removeSession = async (logId: number) => {
    try {
      await api.deleteRoutineLog(logId);
      void load();
    } catch (e) {
      setError(String(e));
    }
  };

  if (!Number.isFinite(routineId)) {
    return (
      <PageLayout>
        <p className="text-sm text-red-400">Invalid routine.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header={
        <PageHeader
          title={routine?.name ?? "Routine progress"}
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
      {routine && !loading && (
        <>
          <p className="text-sm text-slate-500">
            {formatRoutineSummary(routine)}
          </p>

          {sessions.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-300">
                Total kcal burned per session
              </h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={caloriesChart} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
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
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#34d399" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {routine.exercises.map((ex) => {
            const unit = normalizeWorkoutAmountUnit(ex.amountUnit);
            const points = entriesForExercise(sessions, ex.exerciseId);
            const showWeight =
              unit === "reps" &&
              points.some((p) => p.weightKg != null && p.weightKg > 0);
            return (
              <div key={ex.exerciseId} className="space-y-3">
                <SectionHeader kind="workout" className="text-sm font-medium">
                  {ex.name}
                </SectionHeader>
                <ProgressCharts
                  points={points}
                  amountUnit={unit}
                  showWeight={showWeight}
                />
              </div>
            );
          })}

          <div className="rounded-xl border border-accent-deep-50 bg-slate-900/80 p-4">
            <SectionHeader kind="workout" className="mb-3 text-sm font-medium">
              Log routine session
            </SectionHeader>
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
            <ul className="space-y-3">
              {routine.exercises.map((ex) => {
                const unit = normalizeWorkoutAmountUnit(ex.amountUnit);
                const row = logEntries[ex.exerciseId] ?? {
                  amount: "",
                  calories: "",
                  weightKg: "",
                };
                return (
                  <li
                    key={ex.exerciseId}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                  >
                    <p className="mb-2 text-sm font-medium text-slate-200">
                      {ex.name}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">
                          {amountMetricLabel(unit)}
                        </label>
                        <NumberInput
                          min={0}
                          className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm"
                          value={row.amount}
                          onChange={(e) =>
                            setLogEntries((prev) => ({
                              ...prev,
                              [ex.exerciseId]: {
                                ...row,
                                amount: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">
                          Kcal burned
                        </label>
                        <NumberInput
                          min={0}
                          className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm"
                          value={row.calories}
                          onChange={(e) =>
                            setLogEntries((prev) => ({
                              ...prev,
                              [ex.exerciseId]: {
                                ...row,
                                calories: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      {unit === "reps" && (
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">
                            Weight (kg)
                          </label>
                          <NumberInput
                            min={0}
                            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm"
                            value={row.weightKg}
                            placeholder="Optional"
                            onChange={(e) =>
                              setLogEntries((prev) => ({
                                ...prev,
                                [ex.exerciseId]: {
                                  ...row,
                                  weightKg: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
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

          {sessions.length > 0 && (
            <div>
              <SectionHeader kind="workout" className="mb-3 text-sm font-medium">
                Session history
              </SectionHeader>
              <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
                {[...sessions].reverse().map((session) => (
                  <li
                    key={session.id}
                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-200">
                        {formatShortDate(session.dayDate)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCaloriesBurned(session.totalCalories)}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                        {session.entries.map((entry) => (
                          <li key={entry.id}>
                            {entry.name} — {summarizeEntry(entry)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <DeleteIconButton
                      onClick={() => void removeSession(session.id)}
                      aria-label={`Delete session on ${session.dayDate}`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {!loading && !routine && !error && (
        <Link to="/workouts" className={pageHeaderActionButtonClass}>
          Back
        </Link>
      )}
    </PageLayout>
  );
}
