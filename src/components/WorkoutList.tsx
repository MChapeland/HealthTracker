import { useState } from "react";
import { DropdownSelect } from "./DropdownSelect";
import { DeleteIconButton } from "./DeleteIconButton";
import { EditIconButton } from "./EditIconButton";
import { NumberInput } from "./NumberInput";
import { api } from "../lib/api";
import {
  DEFAULT_WORKOUT_TYPE,
  estimateWorkoutCalories,
  formatIntensityLabel,
  formatWorkoutTypeLabel,
  normalizeWorkoutIntensity,
  normalizeWorkoutType,
  resolveWorkoutEntryCalories,
  WORKOUT_TYPES,
} from "../lib/workout";
import type { WorkoutEntry, WorkoutIntensity, WorkoutType } from "../types";

interface Props {
  date: string;
  workouts: WorkoutEntry[];
  weightKg: number | null;
  onUpdated: () => void;
}

function WorkoutTypeSelect({
  value,
  onChange,
  id,
}: {
  value: WorkoutType;
  onChange: (value: WorkoutType) => void;
  id?: string;
}) {
  return (
    <DropdownSelect
      id={id}
      className="mt-1"
      value={value}
      onChange={onChange}
      options={WORKOUT_TYPES.map((t) => ({
        value: t.value,
        label: t.label,
      }))}
    />
  );
}

function IntensitySelect({
  value,
  onChange,
}: {
  value: WorkoutIntensity;
  onChange: (value: WorkoutIntensity) => void;
}) {
  return (
    <DropdownSelect
      className="mt-1"
      value={value}
      onChange={onChange}
      options={[
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ]}
    />
  );
}

function resolveCaloriesForSave(
  workoutType: WorkoutType,
  durationMin: number,
  intensity: WorkoutIntensity,
  caloriesRaw: string,
  weightKg: number | null,
  previousOverride: boolean
): { calories: number | null; caloriesOverride: boolean } {
  if (caloriesRaw.trim() === "") {
    const auto =
      weightKg != null
        ? estimateWorkoutCalories(
            durationMin,
            intensity,
            weightKg,
            workoutType
          )
        : null;
    return { calories: auto, caloriesOverride: false };
  }
  const parsed = parseInt(caloriesRaw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Enter a valid calorie amount");
  }
  const auto =
    weightKg != null
      ? estimateWorkoutCalories(
          durationMin,
          intensity,
          weightKg,
          workoutType
        )
      : null;
  const matchesAuto = auto != null && parsed === auto;
  if (matchesAuto && !previousOverride) {
    return { calories: auto, caloriesOverride: false };
  }
  return { calories: parsed, caloriesOverride: true };
}

export function WorkoutList({ date, workouts, weightKg, onUpdated }: Props) {
  const [workoutType, setWorkoutType] = useState<WorkoutType>(DEFAULT_WORKOUT_TYPE);
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState<WorkoutIntensity>("medium");
  const [addCalories, setAddCalories] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editWorkoutType, setEditWorkoutType] =
    useState<WorkoutType>(DEFAULT_WORKOUT_TYPE);
  const [editDuration, setEditDuration] = useState("");
  const [editIntensity, setEditIntensity] =
    useState<WorkoutIntensity>("medium");
  const [editCalories, setEditCalories] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<WorkoutEntry | null>(null);

  const parsedAddDuration = parseInt(duration, 10);
  const addCaloriesPreview =
    weightKg != null &&
    duration.trim() !== "" &&
    Number.isFinite(parsedAddDuration) &&
    parsedAddDuration > 0
      ? estimateWorkoutCalories(
          parsedAddDuration,
          intensity,
          weightKg,
          workoutType
        )
      : null;

  const addWorkout = async () => {
    const durationMin = parseInt(duration, 10);
    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      setAddError("Enter a valid duration");
      return;
    }
    const normalizedType = normalizeWorkoutType(workoutType);
    const normalizedIntensity = normalizeWorkoutIntensity(intensity);
    try {
      const { calories, caloriesOverride } = resolveCaloriesForSave(
        normalizedType,
        durationMin,
        normalizedIntensity,
        addCalories,
        weightKg,
        false
      );
      await api.addWorkout(
        date,
        normalizedType,
        durationMin,
        normalizedIntensity,
        calories,
        caloriesOverride
      );
      setDuration("");
      setAddCalories("");
      setWorkoutType(DEFAULT_WORKOUT_TYPE);
      setIntensity("medium");
      setAddError(null);
      onUpdated();
    } catch (e) {
      setAddError(String(e));
    }
  };

  const startEdit = (workout: WorkoutEntry) => {
    setEditingId(workout.id);
    setEditWorkoutType(normalizeWorkoutType(workout.workoutType));
    setEditDuration(String(workout.durationMin));
    setEditIntensity(normalizeWorkoutIntensity(workout.intensity));
    const displayCalories = resolveWorkoutEntryCalories(workout, weightKg ?? 0);
    setEditCalories(
      workout.caloriesOverride || weightKg == null
        ? String(displayCalories)
        : ""
    );
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditWorkoutType(DEFAULT_WORKOUT_TYPE);
    setEditDuration("");
    setEditIntensity("medium");
    setEditCalories("");
    setEditError(null);
  };

  const saveEdit = async (workout: WorkoutEntry) => {
    const durationMin = parseInt(editDuration, 10);
    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      setEditError("Enter a valid duration");
      return;
    }
    const normalizedType = normalizeWorkoutType(editWorkoutType);
    const normalizedIntensity = normalizeWorkoutIntensity(editIntensity);
    try {
      const { calories, caloriesOverride } = resolveCaloriesForSave(
        normalizedType,
        durationMin,
        normalizedIntensity,
        editCalories,
        weightKg,
        workout.caloriesOverride
      );
      await api.updateWorkout(
        workout.id,
        normalizedType,
        durationMin,
        normalizedIntensity,
        calories,
        caloriesOverride
      );
      cancelEdit();
      onUpdated();
    } catch (e) {
      setEditError(String(e));
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    if (editingId === removeTarget.id) cancelEdit();
    await api.deleteWorkout(removeTarget.id);
    setRemoveTarget(null);
    onUpdated();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
        <p className="mb-2 text-xs font-medium text-slate-500">Add workout</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <div>
            <label className="text-xs text-slate-500">Type</label>
            <WorkoutTypeSelect value={workoutType} onChange={setWorkoutType} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Duration (min)</label>
            <NumberInput
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              placeholder="30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Intensity</label>
            <IntensitySelect value={intensity} onChange={setIntensity} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Calories burned</label>
            <NumberInput
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              placeholder={
                weightKg == null
                  ? "Set weight"
                  : addCaloriesPreview != null
                    ? String(addCaloriesPreview)
                    : "Auto"
              }
              value={addCalories}
              onChange={(e) => setAddCalories(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void addWorkout()}
              className="w-full cursor-pointer rounded-xl bg-accent px-4 py-2 text-sm transition-colors hover:bg-accent-hover sm:w-auto"
            >
              Add
            </button>
          </div>
        </div>
        {addError && <p className="mt-1 text-xs text-red-400">{addError}</p>}
      </div>

      {workouts.length > 0 ? (
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {workouts.map((workout) => {
            const isEditing = editingId === workout.id;
            const displayCalories = resolveWorkoutEntryCalories(
              workout,
              weightKg ?? 0
            );

            return (
              <li key={workout.id} className="text-sm">
                {isEditing ? (
                  <div className="px-4 py-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="text-xs text-slate-500">Type</label>
                        <WorkoutTypeSelect
                          value={editWorkoutType}
                          onChange={setEditWorkoutType}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">
                          Duration (min)
                        </label>
                        <NumberInput
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                          value={editDuration}
                          onChange={(e) => setEditDuration(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">
                          Intensity
                        </label>
                        <IntensitySelect
                          value={editIntensity}
                          onChange={setEditIntensity}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">
                          Calories burned
                        </label>
                        <NumberInput
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                          placeholder={
                            weightKg == null ? "Set weight" : "Auto"
                          }
                          value={editCalories}
                          onChange={(e) => setEditCalories(e.target.value)}
                        />
                      </div>
                    </div>
                    {editError && (
                      <p className="mt-2 text-xs text-red-400">{editError}</p>
                    )}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="cursor-pointer rounded-xl bg-slate-700 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEdit(workout)}
                        className="cursor-pointer rounded-xl bg-accent px-4 py-1.5 text-sm transition-colors hover:bg-accent-hover"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-4 py-2">
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-left">
                        <span className="font-medium text-slate-400">
                          {formatWorkoutTypeLabel(workout.workoutType)}
                        </span>
                        <span className="text-slate-500">
                          {" "}
                          · {workout.durationMin} min ·{" "}
                          {formatIntensityLabel(workout.intensity)}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums font-medium text-slate-400">
                        {displayCalories > 0 ? `-${displayCalories} kcal` : "—"}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <EditIconButton
                        onClick={() => startEdit(workout)}
                        aria-label={`Edit ${formatWorkoutTypeLabel(workout.workoutType)} workout`}
                      />
                      <DeleteIconButton
                        onClick={() => setRemoveTarget(workout)}
                        aria-label={`Remove ${formatWorkoutTypeLabel(workout.workoutType)} workout`}
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-slate-500">
          No workouts logged yet
        </p>
      )}

      {removeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-workout-title"
          onClick={() => setRemoveTarget(null)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="remove-workout-title"
              className="text-base font-semibold text-slate-100"
            >
              Remove workout?
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to remove this{" "}
              <span className="font-medium text-slate-200">
                {formatWorkoutTypeLabel(removeTarget.workoutType)} (
                {removeTarget.durationMin} min)
              </span>{" "}
              workout?
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
