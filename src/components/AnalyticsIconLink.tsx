import type { LinkProps } from "react-router-dom";
import { Link } from "react-router-dom";

export const analyticsIconLinkClass =
  "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#172033] text-slate-400 transition-colors hover:bg-slate-800 hover:text-accent";

type Props = {
  to: LinkProps["to"];
  "aria-label": string;
  className?: string;
};

export function AnalyticsIconLink({ to, className = "", "aria-label": ariaLabel }: Props) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className={`${analyticsIconLinkClass} ${className}`.trim()}
    >
      <i className="fa-solid fa-chart-line text-xs" aria-hidden />
    </Link>
  );
}
