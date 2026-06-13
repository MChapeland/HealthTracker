import {
  GEMINI_FREE_MODEL_OPTIONS,
  GEMINI_MODEL_OPTIONS,
  GEMINI_PAID_MODEL_OPTIONS,
  type GeminiModel,
  type GeminiModelOption,
} from "../lib/geminiModels";
import { DropdownSelect } from "./DropdownSelect";

function ModelLabel({ option }: { option: GeminiModelOption }) {
  return (
    <span>
      {option.label}
      {option.hint && (
        <span className="ml-1 text-slate-500">{option.hint}</span>
      )}
    </span>
  );
}

export function GeminiModelSelect({
  value,
  disabled = false,
  onChange,
}: {
  value: GeminiModel;
  disabled?: boolean;
  onChange: (model: GeminiModel) => void;
}) {
  const normalizedValue =
    GEMINI_MODEL_OPTIONS.find((opt) => opt.id === value)?.id ??
    GEMINI_MODEL_OPTIONS[0].id;

  return (
    <DropdownSelect
      value={normalizedValue}
      disabled={disabled}
      placement="top"
      aria-label="Gemini model"
      triggerClassName="text-slate-100 hover:border-slate-600"
      onChange={onChange}
      groups={[
        {
          label: "Free tier",
          options: GEMINI_FREE_MODEL_OPTIONS.map((opt) => ({
            value: opt.id,
            label: <ModelLabel option={opt} />,
          })),
        },
        {
          label: "Paid — billing required",
          options: GEMINI_PAID_MODEL_OPTIONS.map((opt) => ({
            value: opt.id,
            label: <ModelLabel option={opt} />,
          })),
        },
      ]}
    />
  );
}
