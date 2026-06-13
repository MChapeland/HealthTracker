import { useEffect, useState } from "react";
import { NumberInput } from "./NumberInput";

interface Props {
  teethBrushings: number | null;
  onChange: (teethBrushings: number | null) => void;
}

const innerStepperButtonClass =
  "flex w-8 shrink-0 cursor-pointer items-center justify-center self-stretch bg-transparent text-slate-400 transition-colors hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30";

export function TeethBrushingInput({ teethBrushings, onChange }: Props) {
  const [input, setInput] = useState("");

  useEffect(() => {
    setInput(teethBrushings != null ? String(teethBrushings) : "");
  }, [teethBrushings]);

  const currentCount = teethBrushings ?? 0;

  const apply = (raw: string) => {
    const num = parseInt(raw, 10);
    if (!raw || Number.isNaN(num) || num <= 0) {
      onChange(null);
      return;
    }
    onChange(num);
  };

  const increment = () => {
    const next = currentCount + 1;
    setInput(String(next));
    onChange(next);
  };

  const decrement = () => {
    const next = currentCount - 1;
    if (next <= 0) {
      setInput("");
      onChange(null);
    } else {
      setInput(String(next));
      onChange(next);
    }
  };

  return (
    <div className="flex w-full items-stretch rounded-lg border border-slate-700 bg-slate-800">
      <button
        type="button"
        className={innerStepperButtonClass}
        onClick={decrement}
        disabled={currentCount <= 0}
        aria-label="Decrease teeth brushing count"
      >
        <i className="fa-solid fa-minus text-[10px]" aria-hidden />
      </button>
      <NumberInput
        className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-center text-sm leading-normal focus:outline-none focus:ring-0"
        min={0}
        placeholder="0"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          apply(e.target.value);
        }}
      />
      <button
        type="button"
        className={innerStepperButtonClass}
        onClick={increment}
        aria-label="Increase teeth brushing count"
      >
        <i className="fa-solid fa-plus text-[10px]" aria-hidden />
      </button>
    </div>
  );
}
