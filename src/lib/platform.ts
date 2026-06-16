import { isTauri as tauriIsTauri } from "@tauri-apps/api/core";

let cachedTauri: boolean | null = null;

/**
 * True when running inside the Tauri desktop shell (vs a plain browser tab).
 * Used to decide between the Tauri `invoke` backend and the HTTP backend.
 */
export function isTauri(): boolean {
  if (cachedTauri === null) {
    try {
      cachedTauri = tauriIsTauri();
    } catch {
      cachedTauri =
        typeof window !== "undefined" &&
        "__TAURI_INTERNALS__" in (window as unknown as Record<string, unknown>);
    }
  }
  return cachedTauri;
}

/** True when running as a web page in a normal browser (no Tauri shell). */
export function isWeb(): boolean {
  return !isTauri();
}
