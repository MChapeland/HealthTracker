import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { ScoreRing } from "./ScoreRing";
import { SectionHeader } from "./SectionHeader";
import { TimelineParam } from "./TimelineParam";
import { WorkoutSummary } from "./WorkoutSummary";
import { isBeforeJourneyStart, minWeekOffset, todayString } from "../lib/dates";
import {
  computeDailyScore,
  dayHasScoreData,
  ratingRingColor,
  ratingRingTrackColor,
} from "../lib/scoring";
import { SECTION_ICONS, type SectionIconKind } from "../lib/sectionIcons";
import type { DayRecord, Settings } from "../types";

function statClass(isZero: boolean): string {
  return isZero ? "text-slate-500" : "text-slate-200";
}

function WeekStatRow({
  kind,
  label,
  isZero,
  children,
}: {
  kind: SectionIconKind;
  label: string;
  isZero: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2 text-xs">
      <TimelineParam kind={kind} className="shrink-0 text-slate-400">
        <span className="sr-only">{label}</span>
      </TimelineParam>
      <span className={`shrink-0 text-right tabular-nums ${statClass(isZero)}`}>
        {children}
      </span>
    </div>
  );
}

const weekNavBtnClass =
  "cursor-pointer rounded-md border border-slate-700/60 bg-slate-800/40 text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800/80 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-slate-700/60 disabled:hover:bg-slate-800/40 disabled:hover:text-slate-400";
const weekNavArrowClass = `${weekNavBtnClass} px-1.5 py-1 text-[10px]`;
const weekNavTodayClass = `${weekNavBtnClass} px-2 py-0.5 text-[11px] font-normal`;

function WeekWorkoutDaysGoal({
  goal,
  completed,
}: {
  goal: number;
  completed: number;
}) {
  if (goal <= 0) return null;

  const filled = Math.min(completed, goal);
  const met = completed >= goal;

  return (
    <div
      className={`flex items-center justify-center gap-1 rounded-md border px-2 py-1 ${
        met
          ? "border-emerald-600/50 bg-emerald-600/15"
          : "border-slate-700/60 bg-slate-800/50"
      }`}
      title={`${filled} of ${goal} workout days this week`}
      aria-label={`${filled} of ${goal} workout days this week${met ? ", goal met" : ""}`}
    >
      {Array.from({ length: goal }, (_, i) => (
        <i
          key={i}
          className={`${SECTION_ICONS.workout} text-sm ${
            i < filled ? "text-emerald-400" : "text-slate-600"
          }`}
          aria-hidden
        />
      ))}
    </div>
  );
}

interface Props {
  days: DayRecord[];
  settings: Settings;
  weekOffset: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onTodayWeek: () => void;
}

export function ThisWeekSection({
  days,
  settings,
  weekOffset,
  onPrevWeek,
  onNextWeek,
  onTodayWeek,
}: Props) {
  const today = todayString();
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const canGoPrevWeek =
    weekOffset > minWeekOffset(settings.journeyStartDate, today);
  const workoutDaysThisWeek = ordered.filter((d) => d.workedOut).length;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <SectionHeader
          kind="periodSummary"
          className="justify-self-start text-sm font-medium text-slate-400"
        >
          This week
        </SectionHeader>
        <WeekWorkoutDaysGoal
          goal={settings.workoutDaysPerWeek}
          completed={workoutDaysThisWeek}
        />
        <div className="flex shrink-0 items-center justify-self-end gap-1">
          <button
            type="button"
            onClick={onPrevWeek}
            disabled={!canGoPrevWeek}
            aria-label="Previous week"
            className={weekNavArrowClass}
          >
            <i className="fa-solid fa-chevron-left" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onTodayWeek}
            disabled={weekOffset === 0}
            className={weekNavTodayClass}
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            disabled={weekOffset >= 0}
            aria-label="Next week"
            className={weekNavArrowClass}
          >
            <i className="fa-solid fa-chevron-right" aria-hidden />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 overflow-visible sm:grid-cols-4 lg:grid-cols-7">
        {ordered.map((day) => {
          const isToday = day.date === today;
          const isNotEditable =
            day.date > today ||
            isBeforeJourneyStart(day.date, settings.journeyStartDate);
          const breakdown = computeDailyScore(day, settings);
          const hasScore = dayHasScoreData(day);
          const cardClass = `flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-800 px-3 pb-3 pt-2.5 ${
            isToday ? "bg-slate-800/70" : "bg-slate-900/80"
          } ${
            isNotEditable
              ? "cursor-default"
              : `week-day-card--interactive relative z-0 hover:z-10 ${
                  isToday ? "hover:bg-slate-800/90" : "hover:bg-slate-800/60"
                }`
          }`;

          const cardBody = (
            <>
              <div className="flex items-start justify-between gap-1">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      isToday ? "text-accent" : "text-slate-400"
                    }`}
                  >
                    {format(parseISO(day.date), "EEE")}
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums leading-tight text-slate-600">
                    {format(parseISO(day.date), "dd/MM")}
                  </span>
                </div>
                <div className="shrink-0 translate-x-1 [&>div]:items-end">
                  <ScoreRing
                    percent={hasScore ? breakdown.total : 0}
                    size={32}
                    stroke={4}
                    ringColorClass={
                      hasScore
                        ? ratingRingColor(breakdown.rating)
                        : "text-slate-600"
                    }
                    ringTrackClass={
                      hasScore
                        ? ratingRingTrackColor(breakdown.rating)
                        : "text-slate-700/50"
                    }
                    center={
                      hasScore ? (
                        <span className="text-xs font-semibold tabular-nums leading-none text-slate-100">
                          {breakdown.total}
                        </span>
                      ) : (
                        <></>
                      )
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <WeekStatRow
                  kind="calories"
                  label="Calories"
                  isZero={day.totalCalories <= 0}
                >
                  {day.totalCalories > 0
                    ? `${day.totalCalories.toFixed(0)} kcal`
                    : "0 kcal"}
                </WeekStatRow>
                <WeekStatRow
                  kind="steps"
                  label="Steps"
                  isZero={day.steps == null || day.steps <= 0}
                >
                  {(day.steps ?? 0).toLocaleString()}
                </WeekStatRow>
                <WeekStatRow
                  kind="workout"
                  label="Workout"
                  isZero={
                    !day.workedOut ||
                    day.workoutDurationMin == null ||
                    day.workoutDurationMin <= 0
                  }
                >
                  <WorkoutSummary
                    workedOut={day.workedOut}
                    durationMin={day.workoutDurationMin}
                    intensity={day.workoutIntensity}
                    showIntensity={false}
                    durationClassName={statClass(
                      !day.workedOut ||
                        day.workoutDurationMin == null ||
                        day.workoutDurationMin <= 0
                    )}
                    emptyClassName="text-slate-500"
                  />
                </WeekStatRow>
              </div>
            </>
          );

          if (isNotEditable) {
            return (
              <div key={day.date} className={cardClass}>
                {cardBody}
              </div>
            );
          }

          return (
            <Link
              key={day.date}
              to={`/day/${day.date}`}
              state={{ from: "dashboard" }}
              className={cardClass}
            >
              {cardBody}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
