import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ScoreBadge } from "../components/ScoreBadge";
import { EditIconLink } from "../components/EditIconButton";
import { PageHeader } from "../components/PageHeader";
import { PageLayout } from "../components/PageLayout";
import { TimelineParam } from "../components/TimelineParam";
import { TimelineSeparator } from "../components/TimelineSeparator";
import { WorkoutSummary } from "../components/WorkoutSummary";
import { api } from "../lib/api";
import {
  clampRangeStart,
  defaultRange,
  formatShortDate,
  mergeDaysWithRange,
  todayString,
} from "../lib/dates";
import { getDayKgChangeLabel } from "../lib/metabolism";
import { applyDisplayScores, syncStaleDayScores } from "../lib/syncDayScores";
import { useSettings } from "../hooks/useSettings";
import { FoodEntryCalories } from "../components/FoodEntryCalories";
import { FoodMacroSummary } from "../components/FoodMacroSummary";
import { FoodMacroTooltip, FoodMacroTooltipList } from "../components/FoodMacroTooltip";
import { FoodServingLabel } from "../components/FoodServingLabel";
import type { DayRecord, FoodEntry } from "../types";

function timelineStatClass(isZero: boolean): string {
  return isZero ? "text-slate-600" : "text-slate-400";
}

const timelineParamProps = {
  className: "text-slate-500",
  iconClassName: "shrink-0 text-sm text-slate-600",
} as const;

/** Badge + date group width; dates stay aligned across rows. */
const TIMELINE_ROW_GRID_CLASS =
  "grid w-full grid-cols-[6.25rem_1fr_auto] items-center gap-x-3 px-4 py-3 text-left text-sm";

export function TimelinePage() {
  const { settings } = useSettings();
  const location = useLocation();
  const journeyStart = settings?.journeyStartDate ?? null;
  const [range, setRange] = useState(() =>
    defaultRange(30, journeyStart)
  );
  const [days, setDays] = useState<DayRecord[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [entryCache, setEntryCache] = useState<Record<string, FoodEntry[]>>({});

  const loadTimeline = useCallback(async () => {
    if (!settings) return;
    const start = clampRangeStart(range.start, settings.journeyStartDate);
    const end = range.end;
    if (end < start) {
      setDays([]);
      return;
    }
    const records = await api.listDays(start, end);
    const merged = mergeDaysWithRange(records, start, end);
    setDays(applyDisplayScores(merged, settings));

    const saved = records.filter((d) => d.exists);
    if (saved.length > 0) {
      await syncStaleDayScores(saved, settings);
      const refreshed = await api.listDays(start, end);
      setDays(
        applyDisplayScores(mergeDaysWithRange(refreshed, start, end), settings)
      );
    }
  }, [range, settings]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline, location.key]);

  useEffect(() => {
    if (!settings?.journeyStartDate) return;
    setRange((r) => ({
      start: clampRangeStart(r.start, settings.journeyStartDate),
      end: r.end,
    }));
  }, [settings?.journeyStartDate]);

  const toggleExpand = async (date: string) => {
    const next = new Set(expanded);
    if (next.has(date)) {
      next.delete(date);
    } else {
      next.add(date);
      if (!entryCache[date]) {
        const entries = await api.listFoodEntries(date);
        setEntryCache((c) => ({ ...c, [date]: entries }));
      }
    }
    setExpanded(next);
  };

  const loadMore = () => {
    const start = new Date(range.start);
    start.setDate(start.getDate() - 30);
    const nextStart = start.toISOString().slice(0, 10);
    setRange({
      start: clampRangeStart(nextStart, journeyStart),
      end: range.end,
    });
  };

  const atJourneyStart =
    !!journeyStart && range.start <= journeyStart;

  return (
    <PageLayout
      header={
        <PageHeader
          page="timeline"
          title="Timeline"
          actions={
            <Link
              to={`/day/${todayString()}`}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium hover:bg-accent-hover"
            >
              Log today
            </Link>
          }
        />
      }
      contentClassName=""
    >
      <div className="space-y-1">
        {days.map((day) => {
          const isOpen = expanded.has(day.date);
          const entries = entryCache[day.date];
          const kgLabel =
            settings && day.totalCalories > 0
              ? getDayKgChangeLabel(settings, day)
              : null;
          return (
            <div
              key={day.date}
              className="rounded-xl border border-slate-800 bg-slate-900/40"
            >
              <button
                type="button"
                onClick={() => toggleExpand(day.date)}
                className={TIMELINE_ROW_GRID_CLASS}
              >
                <span className="flex shrink-0 items-center gap-2">
                  <span className="flex w-[1.25rem] shrink-0 items-center">
                    <ScoreBadge
                      variant="dot"
                      score={day.dailyScore}
                      isToday={day.date === todayString()}
                    />
                  </span>
                  <span className="w-[4.5rem] shrink-0 font-medium tabular-nums text-slate-400">
                    {formatShortDate(day.date)}
                  </span>
                </span>
                <span className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                  <TimelineParam kind="weight" {...timelineParamProps}>
                    <span
                      className={timelineStatClass(
                        day.weight == null || day.weight <= 0
                      )}
                    >
                      {day.weight != null ? `${day.weight} kg` : "0 kg"}
                    </span>
                  </TimelineParam>
                  <TimelineSeparator />
                  <TimelineParam kind="calories" {...timelineParamProps}>
                    <span
                      className={timelineStatClass(day.totalCalories <= 0)}
                    >
                      {`${day.totalCalories.toFixed(0)} kcal`}
                    </span>
                    {kgLabel && (
                      <span
                        className={`text-xs ${
                          kgLabel.startsWith("−")
                            ? "text-emerald-500/90"
                            : kgLabel.startsWith("+")
                              ? "text-amber-500/90"
                              : "text-slate-500"
                        }`}
                        title="Estimated fat-mass change from calorie balance"
                      >
                        {" "}
                        ({kgLabel})
                      </span>
                    )}
                  </TimelineParam>
                  <TimelineSeparator />
                  <TimelineParam kind="steps" {...timelineParamProps}>
                    <span
                      className={timelineStatClass(
                        day.steps == null || day.steps <= 0
                      )}
                    >
                      {(day.steps ?? 0).toLocaleString()}
                    </span>
                  </TimelineParam>
                  <TimelineSeparator />
                  <TimelineParam kind="workout" {...timelineParamProps}>
                    <WorkoutSummary
                      workedOut={day.workedOut}
                      durationMin={day.workoutDurationMin}
                      intensity={day.workoutIntensity}
                      showIntensity={false}
                      durationClassName={timelineStatClass(
                        day.workoutDurationMin == null ||
                          day.workoutDurationMin <= 0
                      )}
                      emptyClassName="text-slate-600"
                    />
                  </TimelineParam>
                </span>
                <EditIconLink
                  to={`/day/${day.date}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Edit ${formatShortDate(day.date)}`}
                />
              </button>
              {isOpen && (
                <div className="border-t border-slate-800 px-4 pt-3 pb-0 text-sm text-slate-500">
                  {entries && entries.length > 0 ? (
                    <FoodMacroTooltipList>
                    <ul className="-mx-4 divide-y divide-slate-800">
                      {[...entries]
                        .sort((a, b) => b.calories - a.calories)
                        .map((e) => (
                            <FoodMacroTooltip
                              key={e.id}
                              as="li"
                              entry={e}
                              className="flex cursor-default items-center justify-between gap-3 px-4 py-2.5"
                            >
                              <FoodServingLabel
                                name={e.foodName}
                                quantity={e.quantity}
                                unit={e.unit}
                                nameClassName="font-medium text-slate-500"
                              />
                              <FoodEntryCalories
                                calories={e.calories}
                                dayTotalCalories={day.totalCalories}
                                className="shrink-0 tabular-nums font-medium text-slate-500"
                              />
                            </FoodMacroTooltip>
                          ))}
                    </ul>
                    </FoodMacroTooltipList>
                  ) : (
                    <p className="mb-2 text-slate-600">No food entries</p>
                  )}
                  {settings && (
                    <FoodMacroSummary
                      entries={entries ?? []}
                      settings={settings}
                      className="-mx-4 mb-5 px-4"
                    />
                  )}
                  {day.workedOut && (
                    <p className={entries && entries.length > 0 ? "mt-2" : ""}>
                      Workout: {day.workoutDurationMin ?? "?"} min
                    </p>
                  )}
                  {day.notes && (
                    <p className="mt-1 pb-3 italic text-slate-600">{day.notes}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!atJourneyStart && (
        <button
          type="button"
          onClick={loadMore}
          className="mt-4 w-full rounded-lg border border-slate-700 py-2 text-sm text-slate-400 hover:bg-slate-800"
        >
          Load earlier days
        </button>
      )}
      {journeyStart && (
        <p className="mt-3 text-center text-xs text-slate-500">
          Tracking from {formatShortDate(journeyStart)}
        </p>
      )}
    </PageLayout>
  );
}
