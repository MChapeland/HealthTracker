import { useEffect, useState, type ReactNode } from "react";
import { isAndroid } from "../lib/platform";

/** Shared max width for every main app page (desktop). */
export const PAGE_LAYOUT_WIDTH = "max-w-4xl";

type Props = {
  header?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
};

export function PageLayout({
  header,
  children,
  contentClassName = "space-y-6",
}: Props) {
  const [android, setAndroid] = useState(() => {
    try {
      return isAndroid();
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      setAndroid(isAndroid());
    } catch {
      setAndroid(false);
    }
  }, []);

  const widthClass = android ? "max-w-none px-4" : `px-6 ${PAGE_LAYOUT_WIDTH}`;

  return (
    <div className={`mx-auto w-full py-6 ${widthClass}`}>
      {header ? <div className="mb-6">{header}</div> : null}
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
