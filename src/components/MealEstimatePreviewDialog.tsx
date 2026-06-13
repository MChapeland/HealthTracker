import { useState } from "react";
import { NumberInput } from "./NumberInput";
import { NutrientLabel } from "./NutrientLabel";
import type { MealEstimate } from "../types";

interface Props {
  estimate: MealEstimate;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (estimate: MealEstimate) => void | Promise<void>;
}

function confidenceLabel(confidence: MealEstimate["confidence"]): string {
  switch (confidence) {
    case "low":
      return "Low confidence";
    case "high":
      return "High confidence";
    default:
      return "Medium confidence";
  }
}

function confidenceClass(confidence: MealEstimate["confidence"]): string {
  switch (confidence) {
    case "low":
      return "bg-amber-500/15 text-amber-400";
    case "high":
      return "bg-emerald-500/15 text-emerald-400";
    default:
      return "bg-slate-700 text-slate-300";
  }
}

function macroField(
  label: React.ReactNode,
  value: number | null,
  onChange: (value: number | null) => void
) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <NumberInput
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (!raw) {
            onChange(null);
            return;
          }
          const parsed = Number(raw);
          onChange(Number.isFinite(parsed) ? parsed : null);
        }}
      />
    </div>
  );
}

export function MealEstimatePreviewDialog({
  estimate,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const [draft, setDraft] = useState<MealEstimate>(estimate);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!draft.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!Number.isFinite(draft.calories) || draft.calories <= 0) {
      setError("Enter valid calories");
      return;
    }
    setError(null);
    try {
      await onConfirm({
        ...draft,
        name: draft.name.trim(),
        notes: draft.notes.trim(),
      });
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meal-estimate-title"
      onClick={onCancel}
    >
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3
            id="meal-estimate-title"
            className="text-base font-semibold text-slate-100"
          >
            Review meal estimate
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${confidenceClass(draft.confidence)}`}
          >
            {confidenceLabel(draft.confidence)}
          </span>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Adjust values before adding to your food log.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Name</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              value={draft.name}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Calories</label>
            <NumberInput
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              value={draft.calories}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                setDraft((prev) => ({
                  ...prev,
                  calories: Number.isFinite(parsed) ? parsed : prev.calories,
                }));
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {macroField(
              <NutrientLabel nutrient="protein">Protein (g)</NutrientLabel>,
              draft.protein,
              (protein) => setDraft((prev) => ({ ...prev, protein }))
            )}
            {macroField(
              <NutrientLabel nutrient="carbs">Carbs (g)</NutrientLabel>,
              draft.carbs,
              (carbs) => setDraft((prev) => ({ ...prev, carbs }))
            )}
            {macroField(
              <NutrientLabel nutrient="fat">Fat (g)</NutrientLabel>,
              draft.fat,
              (fat) => setDraft((prev) => ({ ...prev, fat }))
            )}
            {macroField(
              <NutrientLabel nutrient="fiber">Fiber (g)</NutrientLabel>,
              draft.fiber,
              (fiber) => setDraft((prev) => ({ ...prev, fiber }))
            )}
            {macroField(
              <NutrientLabel nutrient="salt">Salt (g)</NutrientLabel>,
              draft.salt,
              (salt) => setDraft((prev) => ({ ...prev, salt }))
            )}
          </div>

          {draft.notes && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-400">
              {draft.notes}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading}
            className="cursor-pointer rounded-xl bg-accent px-4 py-1.5 text-sm transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Adding…" : "Add to log"}
          </button>
        </div>
      </div>
    </div>
  );
}
