import { useMemo, useRef, useState } from "react";
import { DeleteIconButton } from "./DeleteIconButton";
import { EditIconButton } from "./EditIconButton";
import { NumberInput } from "./NumberInput";
import { api } from "../lib/api";
import { entryCalories } from "../lib/calories";
import { FoodMacroSummary } from "./FoodMacroSummary";
import { FoodMacroTooltip, FoodMacroTooltipList } from "./FoodMacroTooltip";
import { formatFoodServing, formatUnitLabel } from "../lib/foodDisplay";
import { parseQuantityInput } from "../lib/evaluateNumberExpression";
import { FoodEntryCalories } from "./FoodEntryCalories";
import { FoodServingLabel } from "./FoodServingLabel";
import { MealEstimatePreviewDialog } from "./MealEstimatePreviewDialog";
import { MealEstimateInvalidDialog } from "./MealEstimateInvalidDialog";
import { isInvalidMealDescriptionError, isInvalidMealEstimate } from "../lib/mealEstimate";
import {
  dropdownMenuClass,
  dropdownMenuEmptyClass,
  dropdownMenuPlacementClass,
  dropdownOptionClass,
} from "../lib/dropdownStyles";
import type { Food, FoodEntry, MealEstimate, Settings } from "../types";

interface Props {
  date: string;
  entries: FoodEntry[];
  foods: Food[];
  dayTotalCalories: number;
  settings: Settings;
  onUpdated: () => void;
}

function foodLabel(f: Food): string {
  return `${f.name} (${f.calories} kcal / ${f.referenceQuantity} ${f.referenceUnit})`;
}

function normalizeConfidence(value: string): MealEstimate["confidence"] {
  if (value === "low" || value === "high") return value;
  return "medium";
}

const foodFormFieldClass =
  "rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm";

export function FoodEntryList({
  date,
  entries,
  foods,
  dayTotalCalories,
  settings,
  onUpdated,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<FoodEntry | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [loggingEstimate, setLoggingEstimate] = useState(false);
  const [estimatePreview, setEstimatePreview] = useState<MealEstimate | null>(
    null
  );
  const [invalidDescriptionOpen, setInvalidDescriptionOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? foods.filter((f) => f.name.toLowerCase().includes(q))
      : [...foods];
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [foods, query]);

  const trimmedQuery = query.trim();
  const showNoMatchingFoods =
    trimmedQuery.length > 0 && filtered.length === 0 && foods.length > 0;
  const canShowEstimateAction =
    showNoMatchingFoods || trimmedQuery.length >= 10;
  const hasApiKey = Boolean(settings.aiApiKey?.trim());
  const canEstimate =
    settings.aiEnabled &&
    settings.mealEstimateEnabled &&
    hasApiKey &&
    trimmedQuery.length > 0;

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.calories - a.calories),
    [entries]
  );

  const selectFood = (food: Food) => {
    setSelectedFoodId(food.id);
    setQuery(food.name);
    setOpen(false);
    setError(null);
  };

  const clearSelection = () => {
    setSelectedFoodId("");
  };

  const addEntry = async () => {
    const food = foods.find((f) => f.id === selectedFoodId);
    if (!food) {
      setError("Select a food");
      return;
    }
    const qty = parseQuantityInput(quantity);
    if (qty == null || qty <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    const cal = entryCalories(food, qty);
    try {
      await api.addFoodEntry(
        date,
        food.id,
        qty,
        food.referenceUnit,
        cal
      );
      setQuantity("");
      setQuery("");
      setSelectedFoodId("");
      setError(null);
      setOpen(false);
      onUpdated();
    } catch (e) {
      setError(String(e));
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    const id = removeTarget.id;
    if (editingId === id) cancelEdit();
    await api.deleteFoodEntry(id);
    setRemoveTarget(null);
    onUpdated();
  };

  const startEdit = (entry: FoodEntry) => {
    setEditingId(entry.id);
    setEditQuantity(String(entry.quantity));
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQuantity("");
    setEditError(null);
  };

  const saveEdit = async (
    entry: FoodEntry,
    quantityRaw: string = editQuantity
  ) => {
    const food = foods.find((f) => f.id === entry.foodId);
    if (!food) {
      setEditError("Food not found in library");
      return;
    }
    const qty = parseQuantityInput(quantityRaw);
    if (qty == null || qty <= 0) {
      setEditError("Enter a valid quantity");
      return;
    }
    const cal = entryCalories(food, qty);
    try {
      await api.updateFoodEntry(entry.id, qty, entry.unit, cal);
      cancelEdit();
      onUpdated();
    } catch (e) {
      setEditError(String(e));
    }
  };

  const handleFocus = () => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }
    setOpen(true);
  };

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => setOpen(false), 150);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (selectedFoodId !== "") {
      const selected = foods.find((f) => f.id === selectedFoodId);
      if (!selected || selected.name !== value) {
        clearSelection();
      }
    }
    setOpen(true);
    setError(null);
  };

  const runEstimate = async () => {
    if (!trimmedQuery) return;
    if (!settings.aiEnabled || !settings.mealEstimateEnabled) {
      setError("Enable AI meal estimates in Settings");
      return;
    }
    if (!hasApiKey) {
      setError("Add your Gemini API key in Settings");
      return;
    }
    setEstimating(true);
    setError(null);
    try {
      const result = await api.estimateMeal(trimmedQuery);
      if (isInvalidMealEstimate(result)) {
        setInvalidDescriptionOpen(true);
        setOpen(false);
        return;
      }
      setEstimatePreview({
        ...result,
        confidence: normalizeConfidence(result.confidence),
      });
      setOpen(false);
    } catch (e) {
      if (isInvalidMealDescriptionError(e)) {
        setInvalidDescriptionOpen(true);
      } else {
        setError(String(e));
      }
    } finally {
      setEstimating(false);
    }
  };

  const confirmEstimate = async (estimate: MealEstimate) => {
    setLoggingEstimate(true);
    try {
      await api.logEstimatedMeal(date, estimate);
      setEstimatePreview(null);
      setQuery("");
      setSelectedFoodId("");
      setQuantity("");
      setError(null);
      onUpdated();
    } finally {
      setLoggingEstimate(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (
      e.key === "Enter" &&
      open &&
      selectedFoodId === "" &&
      canEstimate &&
      !estimating
    ) {
      e.preventDefault();
      void runEstimate();
      return;
    }
    if (e.key === "Enter" && open && filtered.length > 0) {
      e.preventDefault();
      selectFood(filtered[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <p className="mb-2 text-xs font-medium text-slate-500">Add food</p>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              className={`w-full ${foodFormFieldClass}`}
              placeholder="Search or select food..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
            />
            {open && (
              <ul
                className={`${dropdownMenuClass} ${dropdownMenuPlacementClass("bottom")}`}
                role="listbox"
              >
                {canShowEstimateAction && (
                  <li role="option">
                    {canEstimate ? (
                      <button
                        type="button"
                        className={`${dropdownOptionClass(false)} gap-2 disabled:opacity-50`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => void runEstimate()}
                        disabled={estimating}
                      >
                        <i
                          className="fa-solid fa-wand-sparkles shrink-0 text-xs"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          {estimating ? (
                            "Estimating…"
                          ) : (
                            <>
                              Estimate with AI
                              <span className="text-slate-500">
                                {" "}
                                (Add as much detail as you can for better results)
                              </span>
                            </>
                          )}
                        </span>
                        {estimating && (
                          <div
                            className="relative h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-slate-700"
                            role="progressbar"
                            aria-label="Estimating meal"
                          >
                            <div className="estimate-loading-bar absolute inset-y-0 w-1/2 rounded-full bg-accent" />
                          </div>
                        )}
                      </button>
                    ) : settings.aiEnabled && settings.mealEstimateEnabled && !hasApiKey ? (
                      <div className={dropdownMenuEmptyClass}>
                        Add Gemini API key in Settings
                      </div>
                    ) : !settings.aiEnabled || !settings.mealEstimateEnabled ? (
                      <div className={dropdownMenuEmptyClass}>
                        Enable AI meal estimates in Settings
                      </div>
                    ) : null}
                  </li>
                )}
                {filtered.length === 0 ? (
                  foods.length === 0 ? (
                    <li className={dropdownMenuEmptyClass}>
                      No foods in library — add foods in Settings
                    </li>
                  ) : (
                    showNoMatchingFoods && (
                      <li className={dropdownMenuEmptyClass}>
                        No matching foods
                      </li>
                    )
                  )
                ) : (
                  filtered.map((f) => (
                    <li key={f.id} role="option">
                      <button
                        type="button"
                        className={dropdownOptionClass(selectedFoodId === f.id)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectFood(f)}
                      >
                        {foodLabel(f)}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <NumberInput
            className={`w-28 shrink-0 ${foodFormFieldClass}`}
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <div className="flex shrink-0 items-end">
            <button
              type="button"
              onClick={addEntry}
              className="w-full cursor-pointer rounded-xl bg-accent px-4 py-2 text-sm transition-colors hover:bg-accent-hover sm:w-auto"
            >
              Add
            </button>
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>

      <FoodMacroTooltipList disabled={editingId != null}>
      <div className="overflow-visible">
      <ul className="overflow-visible divide-y divide-slate-800">
        {sortedEntries.map((e) => {
          const isEditing = editingId === e.id;
          const food = foods.find((f) => f.id === e.foodId);
          const editQty = parseQuantityInput(editQuantity);
          const previewCal =
            isEditing && food && editQty != null && editQty > 0
              ? entryCalories(food, editQty)
              : null;

          return (
            <li key={e.id} className="relative overflow-visible text-sm">
              {isEditing ? (
                <div className="px-4 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium text-slate-200">
                          {e.foodName}
                        </span>
                        <NumberInput
                          className={`w-20 shrink-0 ${foodFormFieldClass}`}
                          value={editQuantity}
                          onChange={(ev) => setEditQuantity(ev.target.value)}
                          onEnter={(committed) => {
                            setEditQuantity(committed);
                            void saveEdit(e, committed);
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                        />
                        <span className="shrink-0 text-slate-500">
                          {formatUnitLabel(
                            editQty != null && editQty > 0
                              ? editQty
                              : e.quantity,
                            e.unit
                          )}
                        </span>
                      </div>
                      <FoodEntryCalories
                        calories={previewCal ?? e.calories}
                        dayTotalCalories={dayTotalCalories}
                      />
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEdit(e)}
                        className="cursor-pointer rounded-xl bg-accent px-4 py-1.5 text-sm transition-colors hover:bg-accent-hover"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  {editError && (
                    <p className="mt-2 text-xs text-red-400">{editError}</p>
                  )}
                </div>
              ) : (
                <div className="flex cursor-default items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-slate-800/60">
                  <FoodMacroTooltip
                    entry={e}
                    food={food ?? null}
                    className="min-w-0 flex-1 hover:bg-transparent"
                  >
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <FoodServingLabel
                        name={e.foodName}
                        quantity={e.quantity}
                        unit={e.unit}
                        nameClassName="font-medium text-slate-400"
                      />
                      <FoodEntryCalories
                        calories={e.calories}
                        dayTotalCalories={dayTotalCalories}
                      />
                    </div>
                  </FoodMacroTooltip>
                  <div className="relative z-10 flex shrink-0 items-center gap-2">
                    <EditIconButton
                      onClick={() => startEdit(e)}
                      aria-label={`Edit ${e.foodName}`}
                    />
                    <DeleteIconButton
                      onClick={() => setRemoveTarget(e)}
                      aria-label={`Remove ${e.foodName}`}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {sortedEntries.length === 0 && (
          <li className="px-4 pt-4 pb-8 text-center text-sm text-slate-500">
            No food logged yet
          </li>
        )}
      </ul>

      <FoodMacroSummary
        entries={sortedEntries}
        foods={foods}
        settings={settings}
      />
      </div>
      </FoodMacroTooltipList>

      {invalidDescriptionOpen && (
        <MealEstimateInvalidDialog
          onClose={() => setInvalidDescriptionOpen(false)}
        />
      )}

      {estimatePreview && (
        <MealEstimatePreviewDialog
          estimate={estimatePreview}
          loading={loggingEstimate}
          onCancel={() => setEstimatePreview(null)}
          onConfirm={confirmEstimate}
        />
      )}

      {removeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-food-entry-title"
          onClick={() => setRemoveTarget(null)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="remove-food-entry-title"
              className="text-base font-semibold text-slate-100"
            >
              Remove food?
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to remove{" "}
              <span className="font-medium text-slate-200">
                {formatFoodServing(
                  removeTarget.foodName,
                  removeTarget.quantity,
                  removeTarget.unit
                )}
              </span>{" "}
              from this day?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmRemove()}
                className="cursor-pointer rounded-xl bg-red-700 px-4 py-1.5 text-sm transition-colors hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
