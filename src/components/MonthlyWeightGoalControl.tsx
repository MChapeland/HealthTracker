import { useCallback, useEffect, useRef, useState } from "react";
import type { CalorieTargets } from "../lib/calories";
import {
  calorieTargetsFromMonthlyGoal,
  defaultTargetMonthlyWeightChangeKg,
  displayAmountFromMonthlyKg,
  parseWeightChangeRateUnit,
  signedMonthlyKgFromRate,
  weightChangeDirectionFromMonthlyKg,
  weightChangeGoalSafetyWarning,
  type WeightChangeDirection,
} from "../lib/metabolism";
import type { Settings, WeightChangeRateUnit } from "../types";
import { DEFAULT_WEIGHT_CHANGE_RATE_MAGNITUDE } from "../types";
import { WEIGHT_CHANGE_RATE_UNITS } from "../types";
import { DropdownSelect } from "./DropdownSelect";
import { NumberInput } from "./NumberInput";

const fieldClass =
  "rounded-lg border border-slate-700 bg-slate-800 py-2 text-sm text-slate-100 transition-colors hover:border-accent focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";
const inputClass = `${fieldClass} min-w-0 px-3 disabled:hover:border-slate-700`;

type Props = {
  settings: Settings;
  onApply: (
    patch: Partial<Settings> & Partial<CalorieTargets>
  ) => void;
  /** When profile first becomes complete, apply the stored (or default) goal. */
  applyGoalWhenProfileReady?: boolean;
};

function parseMagnitude(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Math.abs(parseFloat(trimmed));
  return Number.isNaN(parsed) ? null : parsed;
}

export function MonthlyWeightGoalControl({
  settings,
  onApply,
  applyGoalWhenProfileReady = false,
}: Props) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const profileReadyRef = useRef(false);

  const storedMonthly = settings.targetMonthlyWeightChangeKg;
  const storedUnit = parseWeightChangeRateUnit(settings.targetWeightChangeUnit);

  const [direction, setDirection] = useState<WeightChangeDirection>(() =>
    weightChangeDirectionFromMonthlyKg(storedMonthly)
  );
  const [unit, setUnit] = useState<WeightChangeRateUnit>(storedUnit);
  const [amountDraft, setAmountDraft] = useState<string | null>(null);

  useEffect(() => {
    setDirection(weightChangeDirectionFromMonthlyKg(storedMonthly));
    setAmountDraft(null);
  }, [storedMonthly]);

  useEffect(() => {
    setUnit(storedUnit);
  }, [storedUnit]);

  useEffect(() => {
    const raw = settings.targetWeightChangeUnit;
    if (raw === storedUnit) return;
    onApply({ targetWeightChangeUnit: storedUnit });
  }, [settings.targetWeightChangeUnit, storedUnit, onApply]);

  const apply = useCallback(
    (
      rawAmount: string,
      dir: WeightChangeDirection,
      rateUnit: WeightChangeRateUnit,
      clearDraft = true
    ) => {
      if (clearDraft) setAmountDraft(null);

      const monthlyKg =
        dir === "maintain"
          ? 0
          : signedMonthlyKgFromRate(
              parseMagnitude(rawAmount),
              rateUnit,
              dir === "lose"
            );

      const merged: Settings = {
        ...settingsRef.current,
        targetMonthlyWeightChangeKg: monthlyKg,
        targetWeightChangeUnit: rateUnit,
      };
      const result = calorieTargetsFromMonthlyGoal(monthlyKg, merged);
      if (result.complete) {
        onApply({
          targetMonthlyWeightChangeKg: monthlyKg,
          targetWeightChangeUnit: rateUnit,
          ...result.targets,
        });
        return;
      }
      onApply({
        targetMonthlyWeightChangeKg: monthlyKg,
        targetWeightChangeUnit: rateUnit,
      });
    },
    [onApply]
  );

  const handleDirectionChange = (dir: WeightChangeDirection) => {
    setDirection(dir);
    if (dir === "maintain") {
      apply("", "maintain", unit, true);
      return;
    }
    apply(
      amountDraft ?? displayAmountFromMonthlyKg(storedMonthly, unit),
      dir,
      unit,
      false
    );
  };

  const handleUnitChange = (rateUnit: WeightChangeRateUnit) => {
    if (direction === "maintain") return;
    setUnit(rateUnit);
    let monthly = storedMonthly;
    if (amountDraft != null) {
      monthly = signedMonthlyKgFromRate(
        parseMagnitude(amountDraft),
        unit,
        direction === "lose"
      );
    }
    const amountStr = displayAmountFromMonthlyKg(monthly, rateUnit);
    setAmountDraft(null);
    apply(amountStr, direction, rateUnit, true);
  };

  const amountDisplay =
    direction === "maintain"
      ? ""
      : amountDraft ?? displayAmountFromMonthlyKg(storedMonthly, unit);

  const profileReady = calorieTargetsFromMonthlyGoal(null, settings).complete;
  const rateFieldsDisabled = !profileReady || direction === "maintain";

  const monthlyForWarning = (() => {
    if (direction === "maintain") return 0;
    if (amountDraft != null) {
      return signedMonthlyKgFromRate(
        parseMagnitude(amountDraft),
        unit,
        direction === "lose"
      );
    }
    if (storedMonthly === 0) return 0;
    if (storedMonthly != null) return storedMonthly;
    return defaultTargetMonthlyWeightChangeKg();
  })();

  const safetyWarning = profileReady
    ? weightChangeGoalSafetyWarning(settings, monthlyForWarning)
    : null;

  useEffect(() => {
    if (!profileReady) {
      profileReadyRef.current = false;
      return;
    }

    const becameReady = !profileReadyRef.current;
    profileReadyRef.current = true;

    if (applyGoalWhenProfileReady && becameReady) {
      const monthly = storedMonthly ?? defaultTargetMonthlyWeightChangeKg();
      apply(
        displayAmountFromMonthlyKg(monthly, unit),
        weightChangeDirectionFromMonthlyKg(monthly),
        unit,
        true
      );
      return;
    }

    if (!applyGoalWhenProfileReady && storedMonthly == null) {
      apply(
        String(DEFAULT_WEIGHT_CHANGE_RATE_MAGNITUDE),
        "lose",
        unit,
        true
      );
    }
  }, [
    profileReady,
    applyGoalWhenProfileReady,
    storedMonthly,
    unit,
    apply,
  ]);

  return (
    <div className="w-full">
      <label className="mb-1.5 block text-xs text-slate-500">
        Weight change rate (calculated from your metabolism profile)
      </label>
      <div className="grid w-full grid-cols-3 gap-2">
        <DropdownSelect
          value={direction}
          disabled={!profileReady}
          aria-label="Lose, gain, or maintain weight"
          onChange={handleDirectionChange}
          options={[
            { value: "lose", label: "Lose" },
            { value: "gain", label: "Gain" },
            { value: "maintain", label: "Maintain" },
          ]}
        />
        <NumberInput
          className={inputClass}
          step="0.01"
          min={0}
          placeholder={String(DEFAULT_WEIGHT_CHANGE_RATE_MAGNITUDE)}
          value={amountDisplay}
          disabled={rateFieldsDisabled}
          onChange={(e) => setAmountDraft(e.target.value)}
          onBlur={(e) => {
            if (direction === "maintain") return;
            apply(e.target.value, direction, unit, true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          aria-label="Weight change amount"
        />
        <DropdownSelect
          value={unit}
          disabled={rateFieldsDisabled}
          aria-label="Weight change rate unit"
          onChange={handleUnitChange}
          options={WEIGHT_CHANGE_RATE_UNITS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
      </div>
      {!profileReady ? (
        <p className="mt-1.5 text-xs text-amber-600/90">
          Add height, birthday, sex, and starting weight above to set targets from
          a weight change goal.
        </p>
      ) : safetyWarning ? (
        <p className="mt-1.5 text-xs text-amber-600/90">{safetyWarning}</p>
      ) : null}
    </div>
  );
}
