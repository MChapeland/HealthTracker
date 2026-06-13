import { useCallback, useEffect, useState } from "react";

import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { CalorieZoneBar } from "../components/CalorieZoneBar";

import { FoodEntryList } from "../components/FoodEntryList";

import { NumberInput } from "../components/NumberInput";

import {
  DAILY_SCORE_SIDE_PANEL_CLASS,
  DAY_PAGE_FIELD_PANEL_CLASS,
  DAY_PAGE_RIGHT_COLUMN_CLASS,
  DAY_PAGE_TOP_GRID_CLASS,
} from "../lib/dailyScoreLayout";
import { DailyScorePanelColumn } from "../components/DailyScorePanel";

import { PageHeader, pageHeaderActionButtonClass } from "../components/PageHeader";

import { PageLayout } from "../components/PageLayout";

import { SectionHeader } from "../components/SectionHeader";

import { WalkingInput } from "../components/WalkingInput";
import { WaterInput } from "../components/WaterInput";
import { TeethBrushingInput } from "../components/TeethBrushingInput";

import { WorkoutList } from "../components/WorkoutList";

import { api } from "../lib/api";
import { isDev } from "../lib/dev";

import {
  dayBackTarget,
  type DayPageLocationState,
} from "../lib/dayNavigation";

import {

  formatDisplayDate,

  isBeforeJourneyStart,

  shiftDate,

  todayString,

} from "../lib/dates";
import { resolveWeightForMetabolism } from "../lib/metabolism";

import { computeDailyScore, resolveDayRating } from "../lib/scoring";

import { syncStaleDayScores } from "../lib/syncDayScores";

import { useSettings } from "../hooks/useSettings";

import {

  inferWorkedOut,

  normalizeWorkoutIntensity,

} from "../lib/workout";

import type {

  DayInput,

  DayRecord,

  Food,

  FoodEntry,

  WorkoutEntry,

} from "../types";



function normalizeDayWorkout(day: DayRecord): DayRecord {

  const workoutIntensity = normalizeWorkoutIntensity(day.workoutIntensity);

  const workedOut = inferWorkedOut(day.workoutDurationMin);

  return { ...day, workoutIntensity, workedOut };

}



export function DayPage() {

  const { date: paramDate } = useParams();

  const date = paramDate ?? todayString();

  const location = useLocation();

  const navigate = useNavigate();

  const { settings, loading: settingsLoading } = useSettings();

  const navState = location.state as DayPageLocationState | null;



  const [day, setDay] = useState<DayRecord | null>(null);

  const [entries, setEntries] = useState<FoodEntry[]>([]);

  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);

  const [foods, setFoods] = useState<Food[]>([]);

  const [currentWeight, setCurrentWeight] = useState<number | null>(null);

  const [previousWeight, setPreviousWeight] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);



  const load = useCallback(async () => {

    const [d, e, w, f, latestWeight, priorWeight] = await Promise.all([

      api.getDay(date),

      api.listFoodEntries(date),

      api.listWorkouts(date),

      api.listFoods(),

      api.getLatestWeight(date),

      api.getLatestWeight(shiftDate(date, -1)),

    ]);

    setDay(normalizeDayWorkout(d));

    setEntries(e);

    setWorkouts(w);

    setFoods(f);

    setCurrentWeight(latestWeight);

    setPreviousWeight(priorWeight);

  }, [date]);



  useEffect(() => {

    if (!settings) return;

    if (isBeforeJourneyStart(date, settings.journeyStartDate)) {

      navigate(`/day/${settings.journeyStartDate!}`, {

        replace: true,

        state: navState,

      });

      return;

    }

    const today = todayString();

    if (!isDev && date > today) {

      navigate(`/day/${today}`, { replace: true, state: navState });

      return;

    }

    load();

  }, [date, settings, navigate, load, navState]);



  useEffect(() => {

    if (!day?.exists || !settings) return;

    const rating = resolveDayRating(day, settings);

    if (rating === day.dailyScore) return;

    void syncStaleDayScores([day], settings).then(() => load());

  }, [

    day?.dailyScore,

    day?.totalCalories,

    day?.waterMl,

    day?.teethBrushings,

    settings,

    load,

  ]);



  const save = async (patch: Partial<DayRecord>) => {

    if (!settings || !day) return;

    setSaving(true);

    const merged = normalizeDayWorkout({ ...day, ...patch });

    const score = computeDailyScore(merged, settings);

    const input: DayInput = {

      date: merged.date,

      weight: merged.weight,

      walkingPrimary: merged.walkingPrimary,

      steps: merged.steps,

      distanceKm: merged.distanceKm,

      durationMin: merged.durationMin,

      workedOut: merged.workedOut,

      workoutDurationMin: merged.workoutDurationMin,

      workoutIntensity: merged.workoutIntensity,

      workoutCalories: merged.workoutCalories,

      workoutCaloriesOverride: merged.workoutCaloriesOverride,

      notes: merged.notes,

      dailyScore: score.rating,

      totalCalories: merged.totalCalories,

      waterMl: merged.waterMl,

      teethBrushings: merged.teethBrushings,

    };

    const saved = await api.upsertDay(input);

    setDay(saved);

    setSaving(false);

  };



  const displayWeight = day?.weight ?? currentWeight;

  const weightKg =

    settings && day

      ? resolveWeightForMetabolism(displayWeight, settings)

      : null;



  if (settingsLoading || !settings || !day) {

    return (

      <div className="flex h-full items-center justify-center text-slate-500">

        Loading...

      </div>

    );

  }



  const scoreBreakdown = computeDailyScore(day, settings);

  const journeyStart = settings.journeyStartDate;
  const today = todayString();
  const isToday = date === today;
  const canGoPrev =
    !journeyStart || shiftDate(date, -1) >= journeyStart;
  const canGoNext = isDev || date < today;
  const backTarget = dayBackTarget(navState);

  const dayNavButtonClass =
    "cursor-pointer rounded-xl bg-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-700";

  return (

    <PageLayout

      header={

        <PageHeader

          page="day"

          title={formatDisplayDate(date)}

          center={
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={() =>
                  navigate(`/day/${shiftDate(date, -1)}`, { state: navState })
                }
                aria-label="Previous day"
                className={dayNavButtonClass}
              >
                <i className="fa-solid fa-chevron-left" aria-hidden />
              </button>
              <button
                type="button"
                disabled={isToday}
                onClick={() =>
                  navigate(`/day/${today}`, { state: navState })
                }
                className={`${dayNavButtonClass} px-4`}
              >
                Today
              </button>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() =>
                  navigate(`/day/${shiftDate(date, 1)}`, { state: navState })
                }
                aria-label="Next day"
                className={dayNavButtonClass}
              >
                <i className="fa-solid fa-chevron-right" aria-hidden />
              </button>
            </div>
          }

          actions={
            <Link to={backTarget.to} className={pageHeaderActionButtonClass}>
              Back
            </Link>
          }

        />

      }

    >

      <div className={`mb-6 ${DAY_PAGE_TOP_GRID_CLASS}`}>

        <DailyScorePanelColumn breakdown={scoreBreakdown} settings={settings} />

        <div className={DAY_PAGE_RIGHT_COLUMN_CLASS}>

          <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <section className={DAY_PAGE_FIELD_PANEL_CLASS}>

              <SectionHeader
                kind="weight"
                as="label"
                className="mb-2 block text-sm font-medium text-slate-400"
              >
                Weight
              </SectionHeader>

              <NumberInput
                step="0.1"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center"
                value={day.weight ?? ""}
                placeholder={
                  day.weight == null && previousWeight != null
                    ? previousWeight.toFixed(1)
                    : undefined
                }
                onChange={(e) => {
                  const v = e.target.value ? parseFloat(e.target.value) : null;
                  setDay({ ...day, weight: v });
                }}
                onBlur={() => save({ weight: day.weight })}
              />

            </section>

            <section className={DAY_PAGE_FIELD_PANEL_CLASS}>

              <SectionHeader kind="steps">Steps</SectionHeader>

              <WalkingInput
                steps={day.steps}
                onChange={(steps) => {
                  const next = {
                    walkingPrimary: "steps" as const,
                    steps,
                    distanceKm: null,
                    durationMin: null,
                  };
                  setDay({ ...day, ...next });
                  save(next);
                }}
              />

            </section>

            <section className={DAY_PAGE_FIELD_PANEL_CLASS}>

              <SectionHeader kind="water">Water</SectionHeader>

              <WaterInput
                waterMl={day.waterMl}
                onChange={(waterMl) => {
                  setDay({ ...day, waterMl });
                  save({ waterMl });
                }}
              />

            </section>

            <section className={DAY_PAGE_FIELD_PANEL_CLASS}>

              <SectionHeader kind="teeth">Brushed</SectionHeader>

              <TeethBrushingInput
                teethBrushings={day.teethBrushings}
                onChange={(teethBrushings) => {
                  setDay({ ...day, teethBrushings });
                  save({ teethBrushings });
                }}
              />

            </section>

          </div>

          <section className={`${DAILY_SCORE_SIDE_PANEL_CLASS} min-h-0 flex-1`}>

            <SectionHeader
              kind="notes"
              as="label"
              className="mb-2 block shrink-0 text-sm font-medium text-slate-400"
            >
              Notes
            </SectionHeader>

            <textarea
              className="min-h-0 w-full flex-1 resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              value={day.notes ?? ""}
              onChange={(e) =>
                setDay({ ...day, notes: e.target.value || null })
              }
              onBlur={() => save({ notes: day.notes })}
              placeholder="How did you feel today?"
            />

          </section>

        </div>

      </div>



      <div className="space-y-6">

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">

          <SectionHeader kind="calories">Food</SectionHeader>

          <CalorieZoneBar calories={day.totalCalories} settings={settings} />

          <div className="mt-4">

            <FoodEntryList

              date={date}

              entries={entries}

              foods={foods}

              dayTotalCalories={day.totalCalories}

              settings={settings}

              onUpdated={load}

            />

          </div>

        </section>



        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">

          <SectionHeader kind="workout">Workouts</SectionHeader>

          <WorkoutList

            date={date}

            workouts={workouts}

            weightKg={weightKg}

            onUpdated={load}

          />

        </section>

      </div>



      {saving && (

        <p className="mt-4 text-center text-xs text-slate-500">Saving...</p>

      )}

    </PageLayout>

  );

}

