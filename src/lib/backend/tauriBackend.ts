import { invoke } from "@tauri-apps/api/core";
import { makeBackend, type HealthTrackerBackend } from "./types";

/**
 * Desktop backend. Every command is dispatched through Tauri `invoke`,
 * preserving the original desktop behavior.
 */
export const tauriBackend: HealthTrackerBackend = makeBackend((command, args) =>
  invoke(command, args)
);
