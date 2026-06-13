import type { ButtonHTMLAttributes } from "react";

export const deleteIconButtonClass =
  "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#172033] text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400";

type DeleteIconButtonProps = {
  "aria-label": string;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "aria-label">;

export function DeleteIconButton({
  className = "",
  type = "button",
  ...props
}: DeleteIconButtonProps) {
  return (
    <button
      type={type}
      className={`${deleteIconButtonClass} ${className}`.trim()}
      {...props}
    >
      <i className="fa-solid fa-xmark text-xs" aria-hidden />
    </button>
  );
}
