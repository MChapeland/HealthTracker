import { save } from "@tauri-apps/plugin-dialog";
import { api } from "./api";
import { isTauri } from "./platform";

function defaultBackupName(): string {
  return `health-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

function downloadInBrowser(contents: string, filename: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Export full app data to a JSON file.
 * - Desktop (Tauri): native save dialog + filesystem write.
 * - Web: triggers a browser download via a Blob + temporary anchor.
 */
export async function exportBackupToFile(): Promise<boolean> {
  const backup = await api.exportBackup();
  const contents = JSON.stringify(backup, null, 2);

  if (!isTauri()) {
    downloadInBrowser(contents, defaultBackupName());
    return true;
  }

  const path = await save({
    filters: [{ name: "JSON", extensions: ["json"] }],
    defaultPath: defaultBackupName(),
  });

  if (!path) {
    return false;
  }

  await api.writeBackupFile(path, contents);
  return true;
}
