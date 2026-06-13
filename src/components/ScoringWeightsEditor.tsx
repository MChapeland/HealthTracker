import { NumberInput } from "./NumberInput";
import { ScoreWeightSlider } from "./ScoreWeightSlider";
import { TimelineParam } from "./TimelineParam";
import {
  foodScoreWeightTotal,
  maxFoodScoreWeightFor,
  maxScoreWeightFor,
  patchFoodScoreWeight,
  patchScoreWeight,
  scoreWeightTotal,
} from "../lib/scoreWeights";
import type { Settings } from "../types";

type Props = {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  showThresholds?: boolean;
  /** Shown above the main weight sliders. */
  weightsIntro?: string;
};

export function ScoringWeightsEditor({
  settings,
  onChange,
  showThresholds = false,
  weightsIntro,
}: Props) {
  const s = settings;
  const dailyTotal = scoreWeightTotal(s);
  const foodTotal = foodScoreWeightTotal(s);

  return (
    <div className="space-y-3">
      {showThresholds ? (
        <div className="grid grid-cols-2 gap-3 border-b border-slate-800 pb-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Good day threshold
            </label>
            <NumberInput
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              value={s.scoreGoodThreshold}
              onChange={(e) =>
                onChange({ scoreGoodThreshold: parseInt(e.target.value, 10) || 75 })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Bad day threshold
            </label>
            <NumberInput
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              value={s.scoreOkayThreshold}
              onChange={(e) =>
                onChange({ scoreOkayThreshold: parseInt(e.target.value, 10) || 25 })
              }
            />
          </div>
        </div>
      ) : null}

      {weightsIntro ? (
        <p className="text-xs text-slate-500">{weightsIntro}</p>
      ) : null}

      <div className="space-y-3">
        {(
          [
            ["scoreWeightCalories", "calories", "Food"],
            ["scoreWeightWalking", "steps", "Walking"],
            ["scoreWeightWorkout", "water", "Water"],
            ["scoreWeightTeeth", "teeth", "Brushed"],
          ] as const
        ).map(([key, kind, label]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-slate-500">
              <TimelineParam kind={kind}>{label}</TimelineParam>
            </span>
            <ScoreWeightSlider
              value={s[key]}
              max={maxScoreWeightFor(s, key)}
              onChange={(next) => onChange(patchScoreWeight(s, key, next))}
            />
            <span className="w-7 shrink-0 text-right text-xs tabular-nums text-slate-200">
              {s[key]}
            </span>
          </div>
        ))}
      </div>
      <p
        className={`text-xs tabular-nums ${
          dailyTotal > 100 ? "text-red-400" : "text-slate-600"
        }`}
      >
        Total weight: {dailyTotal}
        {dailyTotal > 100 ? " — lower weights until the total is 100 or less" : ""}
      </p>

      <div className="border-t border-slate-800 pt-4">
        <h4 className="mb-1 text-xs font-medium text-slate-400">
          Food score split
        </h4>
        <p className="mb-3 text-xs text-slate-500">
          How your food score balances calories against macro nutrients.
        </p>
        <div className="space-y-3">
          {(
            [
              ["scoreWeightFoodKcal", "Kcal"],
              ["scoreWeightFoodMacros", "Macro nutrients"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-slate-500">
                {label}
              </span>
              <ScoreWeightSlider
                value={s[key]}
                max={maxFoodScoreWeightFor(s, key)}
                onChange={(next) =>
                  onChange(patchFoodScoreWeight(s, key, next))
                }
              />
              <span className="w-7 shrink-0 text-right text-xs tabular-nums text-slate-200">
                {s[key]}
              </span>
            </div>
          ))}
        </div>
        <p
          className={`mt-3 text-xs tabular-nums ${
            foodTotal > 100 ? "text-red-400" : "text-slate-600"
          }`}
        >
          Total weight: {foodTotal}
          {foodTotal > 100
            ? " — lower weights until the total is 100 or less"
            : ""}
        </p>
      </div>
    </div>
  );
}
