import { type OsType, type as osType } from "@tauri-apps/plugin-os";

let cached: OsType | null = null;

export function getOsType(): OsType {
  if (cached === null) {
    try {
      cached = osType();
    } catch {
      cached = "windows";
    }
  }
  return cached;
}

export function isAndroid(): boolean {
  return getOsType() === "android";
}

export function isDesktop(): boolean {
  const t = getOsType();
  return t === "windows" || t === "linux" || t === "macos";
}
