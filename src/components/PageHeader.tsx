import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PageId } from "../lib/pageNav";
import { PAGE_DESCRIPTIONS, PAGE_ICONS } from "../lib/pageNav";

type Props = {
  title: string;
  page?: PageId;
  icon?: string;
  subtitle?: string;
  backLink?: { to: string; label: string };
  /** Centered in the header row (e.g. mode toggle). */
  center?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageIcon({
  icon,
  className = "",
}: {
  icon: string;
  className?: string;
}) {
  return (
    <i
      className={`${icon} shrink-0 text-base text-accent-90 ${className}`.trim()}
      aria-hidden
    />
  );
}

function HeaderTitleBlock({
  backLink,
  resolvedIcon,
  title,
  resolvedSubtitle,
}: {
  backLink?: { to: string; label: string };
  resolvedIcon?: string;
  title: string;
  resolvedSubtitle?: string;
}) {
  return (
    <div className="min-w-0">
      {backLink ? (
        <Link
          to={backLink.to}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          ← {backLink.label}
        </Link>
      ) : null}
      <h1
        className={`flex items-center gap-2.5 text-xl font-semibold text-slate-100 ${backLink ? "mt-1" : ""}`.trim()}
      >
        {resolvedIcon ? <PageIcon icon={resolvedIcon} /> : null}
        {title}
      </h1>
      {resolvedSubtitle ? (
        <p className="mt-1 text-sm text-slate-500">{resolvedSubtitle}</p>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  page,
  icon,
  subtitle,
  backLink,
  center,
  actions,
  className = "",
}: Props) {
  const resolvedIcon = icon ?? (page ? PAGE_ICONS[page] : undefined);
  const resolvedSubtitle =
    subtitle ?? (page ? PAGE_DESCRIPTIONS[page] : undefined);

  const titleBlock = (
    <HeaderTitleBlock
      backLink={backLink}
      resolvedIcon={resolvedIcon}
      title={title}
      resolvedSubtitle={resolvedSubtitle}
    />
  );

  if (center) {
    return (
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 ${className}`.trim()}
      >
        {titleBlock}
        <div className="justify-self-center">{center}</div>
        <div className="flex items-center justify-end gap-2">
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start justify-between gap-4 ${className}`.trim()}
    >
      {titleBlock}
      {actions ? (
        <div className="flex shrink-0 items-center gap-2 self-center">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export const pageTitleClass = "text-xl font-semibold text-slate-100";

/** Secondary header action (e.g. Back, Export backup). */
export const pageHeaderActionButtonClass =
  "cursor-pointer rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-300";
