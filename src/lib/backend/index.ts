import { isTauri } from "../platform";
import { httpBackend } from "./httpBackend";
import { tauriBackend } from "./tauriBackend";
import type { HealthTrackerBackend } from "./types";

/**
 * The active backend for the current runtime: Tauri `invoke` on desktop,
 * HTTP `fetch` in the browser.
 */
export const backend: HealthTrackerBackend = isTauri()
  ? tauriBackend
  : httpBackend;

export type { HealthTrackerBackend, SettingsRow } from "./types";
