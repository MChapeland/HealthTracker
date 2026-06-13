import type { ButtonHTMLAttributes } from "react";

export const infoIconButtonClass =
  "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#172033] text-slate-400 transition-colors hover:bg-slate-800 hover:text-accent";

type InfoIconButtonProps = {
  "aria-label": string;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "aria-label">;

export function InfoIconButton({
  className = "",
  type = "button",
  ...props
}: InfoIconButtonProps) {
  return (
    <button
      type={type}
      className={`${infoIconButtonClass} ${className}`.trim()}
      {...props}
    >
      <i className="fa-solid fa-circle-info text-xs" aria-hidden />
    </button>
  );
}
