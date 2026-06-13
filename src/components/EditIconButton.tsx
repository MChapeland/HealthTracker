import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { Link, type LinkProps } from "react-router-dom";

export const editIconButtonClass =
  "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#172033] text-slate-400 transition-colors hover:bg-slate-800 hover:text-accent";

function PencilIcon() {
  return <i className="fa-solid fa-pencil text-xs" aria-hidden />;
}

type EditIconButtonProps = {
  "aria-label": string;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "aria-label">;

export function EditIconButton({
  className = "",
  type = "button",
  ...props
}: EditIconButtonProps) {
  return (
    <button
      type={type}
      className={`${editIconButtonClass} ${className}`.trim()}
      {...props}
    >
      <PencilIcon />
    </button>
  );
}

type EditIconLinkProps = {
  "aria-label": string;
  className?: string;
  to: LinkProps["to"];
  state?: LinkProps["state"];
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

export function EditIconLink({
  to,
  state,
  className = "",
  onClick,
  "aria-label": ariaLabel,
}: EditIconLinkProps) {
  return (
    <Link
      to={to}
      state={state}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${editIconButtonClass} ${className}`.trim()}
    >
      <PencilIcon />
    </Link>
  );
}
