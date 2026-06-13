import { DropdownSelect } from "./DropdownSelect";
import { NumberInput } from "./NumberInput";
import type { Settings, Sex } from "../types";

const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 py-2 text-sm text-slate-100";
const inputClass = `${fieldClass} px-3`;

interface Props {
  values: Pick<Settings, "heightCm" | "birthDate" | "sex">;
  onChange: (patch: Partial<Settings>) => void;
}

export function MetabolismProfileFields({ values, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Height (cm)</label>
          <NumberInput
            className={inputClass}
            placeholder="e.g. 175"
            value={values.heightCm ?? ""}
            onChange={(e) =>
              onChange({
                heightCm: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Birthday</label>
          <input
            type="date"
            className={inputClass}
            value={values.birthDate ?? ""}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) =>
              onChange({
                birthDate: e.target.value || null,
              })
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Sex (for BMR)</label>
          <DropdownSelect<Sex | "">
            value={values.sex ?? ""}
            onChange={(next) =>
              onChange({
                sex: (next || null) as Sex | null,
              })
            }
            placeholder="Select…"
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other / prefer average" },
            ]}
          />
        </div>
    </div>
  );
}
