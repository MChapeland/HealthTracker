import { useEffect, useMemo, useState } from "react";
import { DropdownSelect } from "../components/DropdownSelect";
import { DeleteIconButton } from "../components/DeleteIconButton";
import { EditIconButton } from "../components/EditIconButton";
import { FoodMacroTooltip, FoodMacroTooltipList } from "../components/FoodMacroTooltip";
import { NutrientLabel } from "../components/NutrientLabel";
import { SectionHeader } from "../components/SectionHeader";
import { FoodSortMenu } from "../components/FoodSortMenu";
import { PageHeader } from "../components/PageHeader";
import { PageLayout } from "../components/PageLayout";
import { NumberInput } from "../components/NumberInput";
import { api } from "../lib/api";
import { NUTRIENTS } from "../lib/nutrients";
import { DEFAULT_FOOD_SORT, sortFoods, type FoodSortState } from "../lib/foodSort";
import type { Food, FoodUnit } from "../types";

function scrollMainToTop() {
  document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
}

const emptyFood = (): Omit<Food, "id"> & { id?: number } => ({
  name: "",
  referenceQuantity: 100,
  referenceUnit: "g" as FoodUnit,
  calories: 0,
  protein: null,
  carbs: null,
  fat: null,
  fiber: null,
  salt: null,
  micronutrients: null,
});

export function FoodsPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [lastEatenByFoodId, setLastEatenByFoodId] = useState<
    Record<number, string>
  >({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<FoodSortState>(DEFAULT_FOOD_SORT);
  const [editing, setEditing] = useState<(Omit<Food, "id"> & { id?: number }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Food | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    Promise.all([
      api.listFoods(search || undefined),
      api.getFoodLastEatenDates(),
    ]).then(([nextFoods, lastEaten]) => {
      setFoods(nextFoods);
      setLastEatenByFoodId(lastEaten);
    });

  const sortedFoods = useMemo(
    () => sortFoods(foods, sort, lastEatenByFoodId),
    [foods, sort, lastEatenByFoodId]
  );

  useEffect(() => {
    load();
  }, [search]);

  const save = async () => {
    if (!editing || !editing.name.trim()) {
      setError("Name is required");
      return;
    }
    try {
      if (editing.id) {
        await api.updateFood(editing as Food);
      } else {
        await api.createFood({ ...editing, id: 0 } as Food);
      }
      setEditing(null);
      setError(null);
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteFood(deleteTarget.id);
      if (editing?.id === deleteTarget.id) setEditing(null);
      setDeleteTarget(null);
      setError(null);
      load();
    } catch (e) {
      setError(String(e));
      setDeleteTarget(null);
    }
  };

  return (
    <PageLayout
      header={
        <PageHeader
          page="foods"
          title="Food Library"
          actions={
            <button
              type="button"
              onClick={() => setEditing(emptyFood())}
              className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm transition-colors hover:bg-accent-hover"
            >
              Add food
            </button>
          }
        />
      }
    >
      <div className="mb-4 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          placeholder="Search foods..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FoodSortMenu sort={sort} onChange={setSort} />
      </div>

      {editing && (
        <div className="mb-6 rounded-xl border border-accent-deep-50 bg-slate-900/80 p-4">
          <SectionHeader kind="calories" className="mb-3 text-sm font-medium">
            {editing.id ? "Edit food" : "New food"}
          </SectionHeader>
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 min-[520px]:grid-cols-[minmax(0,1fr)_5rem_6.5rem_5rem]">
              <div className="min-w-0">
                <label className="mb-1 block text-xs text-slate-500">Name</label>
                <input
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"
                  value={editing.name}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev ? { ...prev, name: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="min-w-0 min-[520px]:w-20">
                <label className="mb-1 block text-xs text-slate-500">
                  Amount
                </label>
                <NumberInput
                  min={0}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-2"
                  value={editing.referenceQuantity}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    setEditing((prev) =>
                      prev
                        ? {
                            ...prev,
                            referenceQuantity: Number.isFinite(n) ? n : 0,
                          }
                        : null
                    );
                  }}
                />
              </div>
              <div className="min-w-0 min-[520px]:w-[6.5rem]">
                <label className="mb-1 block text-xs text-slate-500">Unit</label>
                <DropdownSelect
                  value={editing.referenceUnit}
                  onChange={(next) =>
                    setEditing((prev) =>
                      prev
                        ? {
                            ...prev,
                            referenceUnit: next as FoodUnit,
                          }
                        : null
                    )
                  }
                  options={[
                    { value: "g", label: "g" },
                    { value: "serving", label: "serving" },
                  ]}
                />
              </div>
              <div className="min-w-0 min-[520px]:w-20">
                <label className="mb-1 block text-xs text-slate-500">
                  Calories
                </label>
                <NumberInput
                  min={0}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-2"
                  value={editing.calories}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    setEditing((prev) =>
                      prev
                        ? {
                            ...prev,
                            calories: Number.isFinite(n) ? n : 0,
                          }
                        : null
                    );
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
              {NUTRIENTS.map(({ key }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-slate-500">
                    <NutrientLabel nutrient={key} suffix=" (g)" />
                  </label>
                  <NumberInput
                    min={0}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs"
                    value={editing[key] ?? ""}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      setEditing((prev) =>
                        prev
                          ? {
                              ...prev,
                              [key]: Number.isFinite(n) ? n : null,
                            }
                          : null
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="cursor-pointer rounded-xl bg-accent px-4 py-1.5 text-sm transition-colors hover:bg-accent-hover"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <FoodMacroTooltipList>
      <ul className="overflow-visible divide-y divide-slate-800 rounded-xl border border-slate-800">
        {sortedFoods.map((f) => (
          <li
            key={f.id}
            className="relative flex cursor-default items-center justify-between overflow-visible px-4 py-3 text-sm transition-colors hover:bg-slate-800/60"
          >
            <FoodMacroTooltip
              food={f}
              className="min-w-0 flex-1 hover:bg-transparent"
            >
              <div data-food-tooltip-position>
                <p className="font-medium">{f.name}</p>
                <p className="text-xs text-slate-500">
                  {f.calories} kcal / {f.referenceQuantity} {f.referenceUnit}
                </p>
              </div>
            </FoodMacroTooltip>
            <div className="relative z-10 flex shrink-0 gap-2">
              <EditIconButton
                onClick={() => {
                  setEditing(f);
                  scrollMainToTop();
                }}
                aria-label={`Edit ${f.name}`}
              />
              <DeleteIconButton
                onClick={() => setDeleteTarget(f)}
                aria-label={`Delete ${f.name}`}
              />
            </div>
          </li>
        ))}
        {sortedFoods.length === 0 && (
          <li className="px-4 py-8 text-center text-slate-500">
            No foods yet. Add your first food above.
          </li>
        )}
      </ul>
      </FoodMacroTooltipList>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-food-title"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-food-title"
              className="text-base font-semibold text-slate-100"
            >
              Delete food?
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-200">
                {deleteTarget.name}
              </span>
              ? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="cursor-pointer rounded-xl bg-red-700 px-4 py-1.5 text-sm transition-colors hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
