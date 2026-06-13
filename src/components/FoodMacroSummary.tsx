import { useMemo } from "react";
import {
  formatMacroGrams,
  sumEntryMacros,
  type MacroTotals,
} from "../lib/calories";
import {
  macroRingLayers,
  scoreMacroAmount,
  scoreRingColor,
  scoreRingTrackColor,
} from "../lib/scoring";
import type { Food, FoodEntry, Settings } from "../types";
import { MacroScoreRing } from "./MacroScoreRing";
import { NutrientLabel } from "./NutrientLabel";
import { NUTRIENTS } from "../lib/nutrients";

const MACRO_RING_SIZE = 40;
const MACRO_RING_STROKE = 5;
/** Fixed distance from ring center to the macro label below. */
const CENTER_TO_LABEL = 34;
const RING_SLOT_HEIGHT = MACRO_RING_SIZE / 2 + CENTER_TO_LABEL;

type Props = {
  entries?: FoodEntry[];
  foods?: Food[];
  totals?: MacroTotals;
  settings: Settings;
  className?: string;
  showDivider?: boolean;
};

function macroGoalForKey(
  settings: Settings,
  key: keyof MacroTotals
): number | null {
  switch (key) {
    case "carbs":
      return settings.macroGoalCarbs;
    case "fat":
      return settings.macroGoalFat;
    case "protein":
      return settings.macroGoalProtein;
    case "fiber":
      return settings.macroGoalFiber;
    case "salt":
      return settings.macroGoalSalt;
  }
}

export function FoodMacroSummary({
  entries,
  foods = [],
  totals: totalsProp,
  settings,
  className = "",
  showDivider = true,
}: Props) {
  const totals = useMemo(
    () => totalsProp ?? sumEntryMacros(entries ?? [], foods),
    [totalsProp, entries, foods]
  );

  const { scoreGoodThreshold, scoreOkayThreshold, scoreWeightFoodMacros } =
    settings;
  const showMacroScores = scoreWeightFoodMacros > 0;

  return (
    <div
      className={`${showDivider ? "border-t border-slate-800" : ""} ${className}`.trim()}
    >
      <div className="grid grid-cols-5 gap-2 pt-5">
      {NUTRIENTS.map(({ key }) => {
        const amount = totals[key];
        const displayAmount = amount ?? 0;
        const isZero = displayAmount <= 0;
        const goal = macroGoalForKey(settings, key);
        const score = showMacroScores ? scoreMacroAmount(amount, goal) : null;
        const ringLayers = macroRingLayers(amount, goal);
        const ringColor =
          score != null
            ? scoreRingColor(score, scoreGoodThreshold, scoreOkayThreshold)
            : "text-slate-600";
        const ringTrack =
          score != null
            ? scoreRingTrackColor(score, scoreGoodThreshold, scoreOkayThreshold)
            : "text-slate-700/50";

        return (
          <div key={key} className="flex flex-col items-center text-center">
            <div
              className="relative mx-auto overflow-visible"
              style={{
                width: MACRO_RING_SIZE,
                height: RING_SLOT_HEIGHT,
              }}
            >
              <div
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ top: MACRO_RING_SIZE / 2 }}
              >
                {ringLayers ? (
                  <MacroScoreRing
                    layers={ringLayers}
                    size={MACRO_RING_SIZE}
                    stroke={MACRO_RING_STROKE}
                    ringColorClass={ringColor}
                    ringTrackClass={ringTrack}
                    center={
                      score != null ? (
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            isZero ? "text-slate-500" : "text-slate-200"
                          }`}
                        >
                          {Math.round(score)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )
                    }
                  />
                ) : (
                  <div
                    className="relative shrink-0 rounded-full border border-slate-700/50"
                    style={{
                      width: MACRO_RING_SIZE,
                      height: MACRO_RING_SIZE,
                    }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-600">
                      —
                    </span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-slate-500">
              <NutrientLabel
                nutrient={key}
                className="inline-flex items-center justify-center gap-1"
                iconClassName="shrink-0 text-[0.6rem]"
              />
            </p>
            <p className="font-semibold tabular-nums">
              <span className={isZero ? "text-slate-500" : "text-slate-200"}>
                {formatMacroGrams(displayAmount)}
              </span>
              {goal != null && goal > 0 && (
                <span className="text-slate-500">
                  {" / "}
                  {formatMacroGrams(goal)}
                </span>
              )}
            </p>
          </div>
        );
      })}
      </div>
    </div>
  );
}
