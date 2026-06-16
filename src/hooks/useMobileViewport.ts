import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 768px)";

function matches(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(MOBILE_QUERY).matches;
}

/**
 * Reactively reports whether the viewport is in the "mobile" range.
 * Drives the mobile shell (bottom nav, full-width pages) on both small
 * desktop windows and phones/tablets in the browser.
 */
export function useMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => matches());

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
