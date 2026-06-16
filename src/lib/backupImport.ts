import { open } from "@tauri-apps/plugin-dialog";
import { api } from "./api";
import { isTauri } from "./platform";
import type { BackupData, SyncSnapshot } from "../types";

function parseBackupJson(raw: string): BackupData {
  const parsed = JSON.parse(raw) as BackupData | SyncSnapshot;
  if ("data" in parsed && parsed.data && "settings" in parsed.data) {
    return parsed.data;
  }
  if ("settings" in parsed) {
    return parsed as BackupData;
  }
  throw new Error("Unrecognized backup file format.");
}

/** Opens a browser file picker and resolves the chosen file's text contents. */
function pickFileInBrowser(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
      reader.readAsText(file);
    });
    // If the user cancels, no change event fires; that's treated as "no import".
    input.click();
  });
}

/**
 * Import app data from a JSON backup file chosen by the user.
 * - Desktop (Tauri): native open dialog + filesystem read.
 * - Web: hidden `<input type="file">` + `FileReader`.
 */
export async function importBackupFromFile(): Promise<boolean> {
  let raw: string | null;

  if (!isTauri()) {
    raw = await pickFileInBrowser();
  } else {
    const path = await open({
      filters: [{ name: "JSON", extensions: ["json"] }],
      multiple: false,
    });
    if (!path || Array.isArray(path)) {
      return false;
    }
    raw = await api.readBackupFile(path);
  }

  if (!raw) {
    return false;
  }

  const backup = parseBackupJson(raw);
  await api.importBackup(backup);
  return true;
}
