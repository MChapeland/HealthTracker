import type { ReactNode } from "react";

import {

  ratingRingColor,

  ratingRingTrackColor,

  scoreRingColor,

  scoreRingTrackColor,

  type ScoreBreakdown,

} from "../lib/scoring";

import { DAILY_SCORE_PANEL_SHELL_CLASS } from "../lib/dailyScoreLayout";

import type { Settings } from "../types";

import { SectionHeader } from "./SectionHeader";

import { ScoreBadge } from "./ScoreBadge";

import { ScoreRing } from "./ScoreRing";



interface Props {

  breakdown: ScoreBreakdown;

  settings: Settings;

  className?: string;

}



const OVERALL_SIZE = 160;



/** Fills the stretched grid cell so the panel matches sibling column height. */

export function DailyScorePanelSlot({

  children,

  className = "",

}: {

  children: ReactNode;

  className?: string;

}) {

  return (

    <div className={`h-full w-full min-w-0 ${className}`.trim()}>{children}</div>

  );

}



/** Same score column markup on dashboard and day pages. */

export function DailyScorePanelColumn({

  breakdown,

  settings,

  className = "",

}: Omit<Props, "className"> & { className?: string }) {

  return (

    <DailyScorePanelSlot className={className}>

      <DailyScorePanel breakdown={breakdown} settings={settings} />

    </DailyScorePanelSlot>

  );

}



export function DailyScorePanel({

  breakdown,

  settings,

  className = "",

}: Props) {

  const { scoreGoodThreshold, scoreOkayThreshold } = settings;

  const ringColor = (score: number) =>

    scoreRingColor(score, scoreGoodThreshold, scoreOkayThreshold);

  const ringTrack = (score: number) =>

    scoreRingTrackColor(score, scoreGoodThreshold, scoreOkayThreshold);

  const categoryRings = (
    [
      {
        key: "food",
        weight: settings.scoreWeightCalories,
        percent: breakdown.calories,
        label: "Food",
      },
      {
        key: "steps",
        weight: settings.scoreWeightWalking,
        percent: breakdown.walking,
        label: "Steps",
      },
      {
        key: "water",
        weight: settings.scoreWeightWorkout,
        percent: breakdown.water,
        label: "Water",
      },
      {
        key: "teeth",
        weight: settings.scoreWeightTeeth,
        percent: breakdown.teeth,
        label: "Brushed",
      },
    ] as const
  ).filter((ring) => ring.weight > 0);

  return (

    <div className={`${DAILY_SCORE_PANEL_SHELL_CLASS} ${className}`.trim()}>

      <SectionHeader

        kind="dailyScore"

        as="p"

        className="mb-4 shrink-0 text-sm font-medium text-slate-400"

      >

        Daily score

      </SectionHeader>

      <div className="flex flex-1 flex-col items-center justify-center">

        <ScoreRing

          percent={breakdown.total}

          size={OVERALL_SIZE}

          stroke={15}

          ringColorClass={ratingRingColor(breakdown.rating)}

          ringTrackClass={ratingRingTrackColor(breakdown.rating)}

          center={

            <div className="flex translate-y-1 flex-col items-center gap-2.5">

              <span
                className={`-translate-y-0.5 text-4xl font-semibold leading-none tabular-nums ${
                  Math.round(breakdown.total) <= 0
                    ? "text-slate-500"
                    : "text-slate-100"
                }`}
              >
                {Math.round(breakdown.total)}

              </span>

              <ScoreBadge score={breakdown.rating} />

            </div>

          }

        />



        {categoryRings.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-3 sm:gap-4">
            {categoryRings.map(({ key, percent, label }) => (
              <ScoreRing
                key={key}
                percent={percent}
                label={label}
                size={48}
                stroke={6}
                ringColorClass={ringColor(percent)}
                ringTrackClass={ringTrack(percent)}
              />
            ))}
          </div>
        )}

      </div>

    </div>

  );

}


