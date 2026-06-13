import { open } from "@tauri-apps/plugin-dialog";
import { api } from "./api";
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

/** Import app data from a JSON backup file chosen by the user. */
export async function importBackupFromFile(): Promise<boolean> {
  const path = await open({
    filters: [{ name: "JSON", extensions: ["json"] }],
    multiple: false,
  });

  if (!path || Array.isArray(path)) {
    return false;
  }

  const raw = await api.readBackupFile(path);
  const backup = parseBackupJson(raw);
  await api.importBackup(backup);
  return true;
}
