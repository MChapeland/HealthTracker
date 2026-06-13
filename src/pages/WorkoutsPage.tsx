import { useEffect, useMemo, useState } from "react";
import { AnalyticsIconLink } from "../components/AnalyticsIconLink";
import { DropdownSelect } from "../components/DropdownSelect";
import { DeleteIconButton } from "../components/DeleteIconButton";
import { EditIconButton } from "../components/EditIconButton";
import { PageHeader } from "../components/PageHeader";
import { PageLayout } from "../components/PageLayout";
import { NumberInput } from "../components/NumberInput";
import { RoutineSortMenu } from "../components/RoutineSortMenu";
import { SectionHeader } from "../components/SectionHeader";
import { SegmentToggle } from "../components/SegmentToggle";
import { WorkoutTemplateSortMenu } from "../components/WorkoutTemplateSortMenu";
import { api } from "../lib/api";
import {
  DEFAULT_ROUTINE_SORT,
  formatRoutineExerciseLine,
  formatRoutineSummary,
  sortRoutines,
  type RoutineSortState,
} from "../lib/routineLibrary";
import {
  DEFAULT_WORKOUT_TEMPLATE_SORT,
  formatWorkoutTemplateSummary,
  normalizeWorkoutAmountUnit,
  sortWorkoutTemplates,
  WORKOUT_AMOUNT_UNITS,
  type WorkoutTemplateSortState,
} from "../lib/workoutLibrary";
import type { Routine, WorkoutAmountUnit, WorkoutTemplate } from "../types";

type LibraryMode = "exercises" | "routines";

type RoutineDraft = {
  id?: number;
  name: string;
  exerciseIds: number[];
};

function scrollMainToTop() {
  document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
}

const emptyExercise = (): Omit<WorkoutTemplate, "id"> & { id?: number } => ({
  name: "",
  amount: 1,
  amountUnit: "reps" as WorkoutAmountUnit,
  calories: 0,
  createdAt: "",
});

const emptyRoutine = (): RoutineDraft => ({
  name: "",
  exerciseIds: [],
});

const LIBRARY_MODE_OPTIONS: { value: LibraryMode; label: string }[] = [
  { value: "exercises", label: "Exercises" },
  { value: "routines", label: "Routines" },
];

export function WorkoutsPage() {
  const [mode, setMode] = useState<LibraryMode>("exercises");
  const [exercises, setExercises] = useState<WorkoutTemplate[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [search, setSearch] = useState("");
  const [exerciseSort, setExerciseSort] = useState<WorkoutTemplateSortState>(
    DEFAULT_WORKOUT_TEMPLATE_SORT
  );
  const [routineSort, setRoutineSort] = useState<RoutineSortState>(
    DEFAULT_ROUTINE_SORT
  );
  const [editingExercise, setEditingExercise] = useState<
    (Omit<WorkoutTemplate, "id"> & { id?: number }) | null
  >(null);
  const [editingRoutine, setEditingRoutine] = useState<RoutineDraft | null>(
    null
  );
  const [deleteExerciseTarget, setDeleteExerciseTarget] =
    useState<WorkoutTemplate | null>(null);
  const [deleteRoutineTarget, setDeleteRoutineTarget] =
    useState<Routine | null>(null);
  const [addExerciseId, setAddExerciseId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadExercises = () =>
    api.listWorkoutTemplates(search || undefined).then(setExercises);

  const loadRoutines = () =>
    api.listRoutines(search || undefined).then(setRoutines);

  const sortedExercises = useMemo(
    () => sortWorkoutTemplates(exercises, exerciseSort),
    [exercises, exerciseSort]
  );

  const sortedRoutines = useMemo(
    () => sortRoutines(routines, routineSort),
    [routines, routineSort]
  );

  const exerciseById = useMemo(() => {
    const map = new Map<number, WorkoutTemplate>();
    for (const e of exercises) map.set(e.id, e);
    return map;
  }, [exercises]);

  const availableToAdd = useMemo(
    () =>
      exercises.filter(
        (e) => !editingRoutine?.exerciseIds.includes(e.id)
      ),
    [exercises, editingRoutine?.exerciseIds]
  );

  useEffect(() => {
    if (mode === "exercises") {
      void loadExercises();
    } else {
      void loadRoutines();
      void loadExercises();
    }
  }, [search, mode]);

  const switchMode = (next: LibraryMode) => {
    setMode(next);
    setEditingExercise(null);
    setEditingRoutine(null);
    setDeleteExerciseTarget(null);
    setDeleteRoutineTarget(null);
    setAddExerciseId("");
    setError(null);
  };

  const saveExercise = async () => {
    if (!editingExercise || !editingExercise.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!editingExercise.amountUnit.trim()) {
      setError("Unit is required");
      return;
    }
    try {
      if (editingExercise.id) {
        await api.updateWorkoutTemplate(editingExercise as WorkoutTemplate);
      } else {
        await api.createWorkoutTemplate({
          ...editingExercise,
          id: 0,
        } as WorkoutTemplate);
      }
      setEditingExercise(null);
      setError(null);
      void loadExercises();
    } catch (e) {
      setError(String(e));
    }
  };

  const saveRoutine = async () => {
    if (!editingRoutine || !editingRoutine.name.trim()) {
      setError("Name is required");
      return;
    }
    if (editingRoutine.exerciseIds.length === 0) {
      setError("Add at least one exercise to the routine");
      return;
    }
    try {
      if (editingRoutine.id) {
        await api.updateRoutine(
          editingRoutine.id,
          editingRoutine.name,
          editingRoutine.exerciseIds
        );
      } else {
        await api.createRoutine(
          editingRoutine.name,
          editingRoutine.exerciseIds
        );
      }
      setEditingRoutine(null);
      setAddExerciseId("");
      setError(null);
      void loadRoutines();
    } catch (e) {
      setError(String(e));
    }
  };

  const confirmDeleteExercise = async () => {
    if (!deleteExerciseTarget) return;
    try {
      await api.deleteWorkoutTemplate(deleteExerciseTarget.id);
      if (editingExercise?.id === deleteExerciseTarget.id) {
        setEditingExercise(null);
      }
      setDeleteExerciseTarget(null);
      setError(null);
      void loadExercises();
      if (mode === "routines") void loadRoutines();
    } catch (e) {
      setError(String(e));
      setDeleteExerciseTarget(null);
    }
  };

  const confirmDeleteRoutine = async () => {
    if (!deleteRoutineTarget) return;
    try {
      await api.deleteRoutine(deleteRoutineTarget.id);
      if (editingRoutine?.id === deleteRoutineTarget.id) {
        setEditingRoutine(null);
      }
      setDeleteRoutineTarget(null);
      setError(null);
      void loadRoutines();
    } catch (e) {
      setError(String(e));
      setDeleteRoutineTarget(null);
    }
  };

  const addExerciseToRoutine = () => {
    const id = parseInt(addExerciseId, 10);
    if (!editingRoutine || !Number.isFinite(id)) return;
    if (editingRoutine.exerciseIds.includes(id)) return;
    setEditingRoutine({
      ...editingRoutine,
      exerciseIds: [...editingRoutine.exerciseIds, id],
    });
    setAddExerciseId("");
  };

  const removeExerciseFromRoutine = (exerciseId: number) => {
    if (!editingRoutine) return;
    setEditingRoutine({
      ...editingRoutine,
      exerciseIds: editingRoutine.exerciseIds.filter((id) => id !== exerciseId),
    });
  };

  const moveRoutineExercise = (index: number, direction: -1 | 1) => {
    if (!editingRoutine) return;
    const next = index + direction;
    if (next < 0 || next >= editingRoutine.exerciseIds.length) return;
    const ids = [...editingRoutine.exerciseIds];
    [ids[index], ids[next]] = [ids[next], ids[index]];
    setEditingRoutine({ ...editingRoutine, exerciseIds: ids });
  };

  const isExercises = mode === "exercises";
  const addLabel = isExercises ? "Add exercise" : "Add routine";

  return (
    <PageLayout
      header={
        <PageHeader
          page="workouts"
          title="Workout Library"
          center={
            <SegmentToggle
              value={mode}
              options={LIBRARY_MODE_OPTIONS}
              onChange={switchMode}
              ariaLabel="Library view"
            />
          }
          actions={
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (isExercises) {
                  setEditingRoutine(null);
                  setEditingExercise(emptyExercise());
                } else {
                  setEditingExercise(null);
                  setEditingRoutine(emptyRoutine());
                }
                scrollMainToTop();
              }}
              className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm transition-colors hover:bg-accent-hover"
            >
              {addLabel}
            </button>
          }
        />
      }
    >
      <div className="mb-4 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          placeholder={
            isExercises ? "Search exercises..." : "Search routines..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isExercises ? (
          <WorkoutTemplateSortMenu sort={exerciseSort} onChange={setExerciseSort} />
        ) : (
          <RoutineSortMenu sort={routineSort} onChange={setRoutineSort} />
        )}
      </div>

      {editingExercise && isExercises && (
        <div className="mb-6 rounded-xl border border-accent-deep-50 bg-slate-900/80 p-4">
          <SectionHeader kind="workout" className="mb-3 text-sm font-medium">
            {editingExercise.id ? "Edit exercise" : "New exercise"}
          </SectionHeader>
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 min-[520px]:grid-cols-[minmax(0,1fr)_5rem_6.5rem_7rem]">
              <div className="min-w-0">
                <label className="mb-1 block text-xs text-slate-500">Name</label>
                <input
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"
                  value={editingExercise.name}
                  placeholder="e.g. Bent Over Rows"
                  onChange={(e) =>
                    setEditingExercise((prev) =>
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
                  value={editingExercise.amount}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    setEditingExercise((prev) =>
                      prev
                        ? {
                            ...prev,
                            amount: Number.isFinite(n) && n > 0 ? n : 0,
                          }
                        : null
                    );
                  }}
                />
              </div>
              <div className="min-w-0 min-[520px]:w-[6.5rem]">
                <label className="mb-1 block text-xs text-slate-500">Unit</label>
                <DropdownSelect
                  value={normalizeWorkoutAmountUnit(editingExercise.amountUnit)}
                  onChange={(next) =>
                    setEditingExercise((prev) =>
                      prev
                        ? {
                            ...prev,
                            amountUnit: next as WorkoutAmountUnit,
                          }
                        : null
                    )
                  }
                  options={WORKOUT_AMOUNT_UNITS.map((u) => ({
                    value: u.value,
                    label: u.label,
                  }))}
                />
              </div>
              <div className="min-w-0 min-[520px]:w-28">
                <label className="mb-1 block text-xs text-slate-500">
                  Calories burned
                </label>
                <NumberInput
                  min={0}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-2"
                  value={editingExercise.calories}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    setEditingExercise((prev) =>
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
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingExercise(null);
                setError(null);
              }}
              className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveExercise()}
              className="cursor-pointer rounded-xl bg-accent px-4 py-1.5 text-sm transition-colors hover:bg-accent-hover"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {editingRoutine && !isExercises && (
        <div className="mb-6 rounded-xl border border-accent-deep-50 bg-slate-900/80 p-4">
          <SectionHeader kind="workout" className="mb-3 text-sm font-medium">
            {editingRoutine.id ? "Edit routine" : "New routine"}
          </SectionHeader>
          <p className="mb-3 text-xs text-slate-500">
            Combine exercises into a routine to track progress over time — reps,
            weight, distance, duration, and calories burned.
          </p>
          <div className="grid gap-3 text-sm">
            <div className="max-w-md">
              <label className="mb-1 block text-xs text-slate-500">Name</label>
              <input
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"
                value={editingRoutine.name}
                placeholder="e.g. Upper body"
                onChange={(e) =>
                  setEditingRoutine((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-slate-500">
                Exercises in this routine
              </label>
              {editingRoutine.exerciseIds.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No exercises added yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
                  {editingRoutine.exerciseIds.map((id, index) => {
                    const ex = exerciseById.get(id);
                    if (!ex) return null;
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{ex.name}</p>
                          <p className="text-xs text-slate-500">
                            {formatWorkoutTemplateSummary(ex)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            className="cursor-pointer rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Move ${ex.name} up`}
                            onClick={() => moveRoutineExercise(index, -1)}
                          >
                            <i className="fa-solid fa-chevron-up text-xs" aria-hidden />
                          </button>
                          <button
                            type="button"
                            disabled={
                              index === editingRoutine.exerciseIds.length - 1
                            }
                            className="cursor-pointer rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Move ${ex.name} down`}
                            onClick={() => moveRoutineExercise(index, 1)}
                          >
                            <i className="fa-solid fa-chevron-down text-xs" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer rounded p-1 text-red-400/80 transition-colors hover:bg-slate-800 hover:text-red-400"
                            aria-label={`Remove ${ex.name}`}
                            onClick={() => removeExerciseFromRoutine(id)}
                          >
                            <i className="fa-solid fa-xmark" aria-hidden />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {exercises.length === 0 ? (
              <p className="text-xs text-amber-400/90">
                Create exercises first, then add them to this routine.
              </p>
            ) : availableToAdd.length > 0 ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <label className="mb-1 block text-xs text-slate-500">
                    Add exercise
                  </label>
                  <DropdownSelect
                    value={addExerciseId}
                    placeholder="Select exercise…"
                    onChange={setAddExerciseId}
                    options={availableToAdd.map((e) => ({
                      value: String(e.id),
                      label: e.name,
                    }))}
                  />
                </div>
                <button
                  type="button"
                  disabled={!addExerciseId}
                  onClick={addExerciseToRoutine}
                  className="cursor-pointer rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                All exercises are already in this routine.
              </p>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingRoutine(null);
                setAddExerciseId("");
                setError(null);
              }}
              className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveRoutine()}
              className="cursor-pointer rounded-xl bg-accent px-4 py-1.5 text-sm transition-colors hover:bg-accent-hover"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {isExercises ? (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {sortedExercises.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-800/60"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-slate-500">
                  {formatWorkoutTemplateSummary(t)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <AnalyticsIconLink
                  to={`/workouts/exercises/${t.id}/analytics`}
                  aria-label={`Analytics for ${t.name}`}
                />
                <EditIconButton
                  onClick={() => {
                    setEditingRoutine(null);
                    setEditingExercise({
                      ...t,
                      amountUnit: normalizeWorkoutAmountUnit(t.amountUnit),
                    });
                    scrollMainToTop();
                  }}
                  aria-label={`Edit ${t.name}`}
                />
                <DeleteIconButton
                  onClick={() => setDeleteExerciseTarget(t)}
                  aria-label={`Delete ${t.name}`}
                />
              </div>
            </li>
          ))}
          {sortedExercises.length === 0 && (
            <li className="px-4 py-8 text-center text-slate-500">
              No exercises yet. Add your first exercise above.
            </li>
          )}
        </ul>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {sortedRoutines.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-800/60"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-slate-500">
                  {formatRoutineSummary(r)}
                </p>
                {r.exercises.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                    {r.exercises.map((ex) => (
                      <li key={ex.id}>
                        {ex.name} — {formatRoutineExerciseLine(ex)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <AnalyticsIconLink
                  to={`/workouts/routines/${r.id}/analytics`}
                  aria-label={`Analytics for ${r.name}`}
                />
                <EditIconButton
                  onClick={() => {
                    setEditingExercise(null);
                    setEditingRoutine({
                      id: r.id,
                      name: r.name,
                      exerciseIds: r.exercises.map((e) => e.exerciseId),
                    });
                    scrollMainToTop();
                  }}
                  aria-label={`Edit ${r.name}`}
                />
                <DeleteIconButton
                  onClick={() => setDeleteRoutineTarget(r)}
                  aria-label={`Delete ${r.name}`}
                />
              </div>
            </li>
          ))}
          {sortedRoutines.length === 0 && (
            <li className="px-4 py-8 text-center text-slate-500">
              No routines yet. Add exercises first, then create a routine.
            </li>
          )}
        </ul>
      )}

      {deleteExerciseTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-exercise-title"
          onClick={() => setDeleteExerciseTarget(null)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-exercise-title"
              className="text-base font-semibold text-slate-100"
            >
              Delete exercise?
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-200">
                {deleteExerciseTarget.name}
              </span>
              ? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteExerciseTarget(null)}
                className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteExercise()}
                className="cursor-pointer rounded-xl bg-red-700 px-4 py-1.5 text-sm transition-colors hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteRoutineTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-routine-title"
          onClick={() => setDeleteRoutineTarget(null)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-routine-title"
              className="text-base font-semibold text-slate-100"
            >
              Delete routine?
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-200">
                {deleteRoutineTarget.name}
              </span>
              ? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteRoutineTarget(null)}
                className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteRoutine()}
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
